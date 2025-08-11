
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

const { Client, Collection, Events, GatewayIntentBits, MessageFlags, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require("discord.js");
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

// command handling https://discordjs.guide/creating-your-bot/slash-commands.html
client.on(Events.InteractionCreate, async interaction => {

	if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName == "draw") {

        const argArr = interaction.options._hoistedOptions;

        const pos = argArr.find((arg) => arg.name == "pos").value;
        const size = argArr.find((arg) => arg.name == "size").value;

        console.log("New generation:");
        console.log("  Pos:" + pos);
        console.log("  Size:" + size);

        await interaction.reply({ content: "This isn't implemented yet lol", flags: MessageFlags.Ephemeral });

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
                    .setName("draw")
                    .setDescription("Generate an image using Paperspace.")
                    .addStringOption(option => option.setName("pos").setDescription("Positive prompt.").setRequired(true))
                    .addStringOption(option => option.setName("size").setDescription("Resulting image size.").setRequired(true).addChoices(
                        { name: '1200x1200', value: "square" },
                        { name: '1000x1600', value: "tall" },
                        { name: '1600x1000', value: "wide" }
                    ))
                    .toJSON()
            ];

            const rest = new REST().setToken(token);

            console.log(`Started refreshing ${ commands.length } application (/) commands.`);

            // the put method is used to fully refresh all commands in the guild with the current set
            const data = await rest.put(
                Routes.applicationCommands(clientID),
                { body: commands },
            );

            console.log(`Successfully reloaded ${ data.length } application (/) commands.`);

        } catch (error) {
            console.error(error);
        }
    })();
}

// start bot
client.login(token);
