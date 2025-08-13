
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

const { Client, Events, GatewayIntentBits, MessageFlags } = require("discord.js");
const { attemptEmbedArtFromMessage } = require("./embed_art.js");
const { commands, attemptRedeployCommands } = require("./drawing.js");
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

    const getArgValue = (name) => {
        
        const argument = interaction.options._hoistedOptions.find((arg) => arg.name == name);

        return argument ? argument.value : undefined;
    };

    if (interaction.commandName == "loras") {

        

    } else if (interaction.commandName == "setgradioid") {

    } else if (interaction.commandName == "draw") {

    } else {

        await interaction.reply({ content: "Command doesn't exist!", flags: MessageFlags.Ephemeral });
    }
});

// message handling
client.on(Events.MessageCreate, message => {

    if (message.author.bot) { return; }

    attemptEmbedArtFromMessage(client, message);
});

// ask for setup and start bot
attemptRedeployCommands(token, clientID);
client.login(token);
