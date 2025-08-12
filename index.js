
function getConfig() {

    try {
        return require("../config.json");
    } catch (error) {
        console.error("Please run:");
        console.error("echo '{ \"token\": \"<YOUR_TOKEN>\", \"clientID\": \"<YOUR_CLIENT_ID>\" }' > ../config.json");
        console.error("Key: Go to https://discord.com/developers/applications, select your app, select 'Bot' on the sidebar, and select 'Reset Token.'");
        console.error("Client ID: Go to https://discord.com/developers/applications, select your app, select 'General Information' on the sidebar, and copy the 'Application ID.'");
        process.exit(1);
    }
}

const { Client, Collection, Events, GatewayIntentBits, MessageFlags, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, REST, Routes, AttachmentBuilder } = require("discord.js");
const { attemptEmbedArtFromMessage } = require("./embed_art.js");
const { token, clientID } = getConfig();
const client = new Client({
    // https://discordjs.guide/popular-topics/intents.html#privileged-intents
    intents: [
        GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// executed once upon client ready
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// executed upon joining server https://discord.js.org/docs/packages/discord.js/14.21.0/Client:Class#guildMemberAdd
// make sure the bot has permissions to send in the system channel!
client.on(Events.GuildMemberAdd, member => {

    console.log(`New member joined: ${ member.user.tag } in ${ member.guild.name }`);

    const welcomeChannel = member.guild.systemChannel;

    if (welcomeChannel) {
        welcomeChannel.send(`Welcome to the server, <@${ member.user.id }>! Please verify by sending your favourite color and a short explanation for why you're here in this channel. A moderator will verify you shortly.`);
    }
});

// mini goal is to have the bot take in a paperspace key as part of the config, and having a "start drawing backend" and "stop drawing backend" command, creating the notebook, starting it, and storing the gradio link
// then we can remove the slightly cumbersome setgradioid command, and I also don't have to open paperspace to start the drawing

// AI image commands can be run in any channel right now
// add a /allow and /disallow command to tell the bot where you can gen (that also means I need non-volatile storage server-side, ugh)
// it'll default to disallowed

let gradioID = undefined;
let genQueue = [];
let genCurrent = undefined;

// queues the generation and fetches when it's its turn. await on this!
async function generateImages(prompt) {

    // instead of polling the API immediately for every drawing request (and overwhelming it/having requests dropped), we have a queueing system
    // the API fetch automatically drops (for the time it takes to gen ~3.5 images) if it's open for too long (even if we extend the fetch's timeout)

    genQueue.push(prompt);

    // wait until nothing it currently being generated AND we're next in queue
    while (genCurrent || genQueue[0] != prompt) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // set ourselves as what's currently being generated
    genCurrent = genQueue.shift();

    // do API request (text to image endpoint <GRADIO_LIVE_URL>/docs#/default/text2imgapi_sdapi_v1_txt2img_post)
    const response = await fetch(`https://${ gradioID }.gradio.live/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            "prompt": prompt.pos,
            "negative_prompt": prompt.neg,
            "seed": prompt.seed,
            // sampler_name: null,
            // scheduler: null,
            "batch_size": prompt.count,
            "steps": 30,
            // cfg_scale: 7,
            "width": prompt.width,
            "height": prompt.height,
            // "sampler_index": "Euler",
            "send_images": true,
            "save_images": false
        })
    });

    // show we're done generating so the next in queue can start
    genCurrent = undefined;

    if (!response.ok) {
        throw new Error(response.status);
    };

    const json = await response.json();

    // console.log("TODO include this as metadata in the image:");
    // console.log(json.info);

    let images = [];

    for (image of json.images) {

        images.push(new AttachmentBuilder(Buffer.from(image, "base64"), { name: "image.png" }));
    }

    return images;
}

// command handling https://discordjs.guide/creating-your-bot/slash-commands.html
client.on(Events.InteractionCreate, async interaction => {

	if (!interaction.isChatInputCommand()) return;

    const getArgValue = (name) => {
        
        const argument = interaction.options._hoistedOptions.find((arg) => arg.name == name);

        return argument ? argument.value : undefined;
    };

    if (interaction.commandName == "setgradioid") {

        // appropriately set gradio ID
        gradioID = getArgValue("id");

        if (gradioID) {
            await interaction.reply({ content: `Set gradio link to https://${ gradioID }.gradio.live/.`, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: `Cleared gradio link.`, flags: MessageFlags.Ephemeral });
        }

    } else if (interaction.commandName == "draw") {

        // if a gradio ID isn't even set, there's no chance the API request will work
        if (!gradioID) {

            await interaction.reply({ content: "Drawing is currently offline. Ping the owner to have them set it up.", flags: MessageFlags.Ephemeral });
            return;
        }

        // tell Discord to wait
        await interaction.deferReply();
        
        try {

            const images = await generateImages({
                pos: getArgValue("pos"),
                neg: getArgValue("neg"),
                seed: -1,
                count: !getArgValue("type") || getArgValue("type") == "single" ? 1 : 3,
                width: getArgValue("size") ? parseInt(getArgValue("size").split("x")[0]) : 1200,
                height: getArgValue("size") ? parseInt(getArgValue("size").split("x")[1]) : 1200
            });

            // update our response with the image
            interaction.editReply({ files: images });

        } catch (error) {

            interaction.editReply(`Something went wrong (${ error }), please try again. If this *keeps happening*, ping the owner.`);
        }

    } else {

        await interaction.reply({ content: "Command doesn't exist!", flags: MessageFlags.Ephemeral });
    }
});

// message handling
client.on(Events.MessageCreate, message => {

    if (message.author.bot) { return; }

    attemptEmbedArtFromMessage(client, message);
});

// asynchronously deploy commands via rest module
const redeploy = require("readline-sync").question("Should we redeploy commands? (May be throttled if you do it too often) [y/N]");

console.log(redeploy);

if (redeploy.trim().toLowerCase() == "y") {

    (async () => {
        try {

            const commands = [
                new SlashCommandBuilder()
                    .setName("setgradioid")
                    .setDescription("Set (or clear) the ID of the gradio sharelink to make requests to.")
                    .addStringOption(option => option.setName("id").setDescription("https://<THIS_PART>.gradio.live/ OR leave empty to clear gradio ID."))
                    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
                    .toJSON()
                ,
                new SlashCommandBuilder()
                    .setName("draw")
                    .setDescription("Generate an image using Paperspace.")
                    .addStringOption(option => option.setName("pos").setDescription("Positive prompt.").setRequired(true))
                    .addStringOption(option => option.setName("neg").setDescription("Negative prompt."))
                    .addStringOption(option => option.setName("size").setDescription("Resulting image size (defaults to square).").addChoices(
                        { name: "square", value: "1200x1200" },
                        { name: "tall", value: "1000x1600" },
                        { name: "wide", value: "1600x1000" }
                    ))
                    .addStringOption(option => option.setName("type").setDescription("Batching and special prompt features (defaults to single).").addChoices(
                        { name: "single", value: "single" },
                        { name: "batch of 3", value: "batch3" },
                        // { name: "progression (put SIZE where you want {medium, huge, gigantic})", value: "1600x1000" }
                    ))
                    .toJSON()
            ];

            const rest = new REST().setToken(token);

            console.log(`Started refreshing ${ commands.length } commands.`);

            // the put method is used to fully refresh all commands in the guild with the current set
            const data = await rest.put(
                Routes.applicationCommands(clientID),
                { body: commands },
            );

            console.log(`Successfully reloaded ${ data.length } commands.`);

        } catch (error) {
            console.error(error);
        }
    })();
}

// start bot
client.login(token);
