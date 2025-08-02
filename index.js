function getToken() {

    try {
        return require("../config.json").token;
    } catch (error) {
        console.error("Please run:");
        console.error("echo '{ \"token\": \"<YOUR_TOKEN>\" }' > ../config.json");
        console.error("with the appropriate key! Find your key by going to https://discord.com/developers/applications, selecting your app, selecting 'Bot' on the sidebar, and selecting 'Reset Token.'");
        process.exit(1);
    }
}

const { Client, Events, GatewayIntentBits } = require("discord.js"); // npm install discord.js
const token = getToken();
const client = new Client({
    // https://discordjs.guide/popular-topics/intents.html#privileged-intents
    intents: [
        GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
    ]
});

// executed once upon client ready
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// message handling
client.on(Events.MessageCreate, message => {

    if (message.author.bot) { return; }

    if (message.content.startsWith("https://www.deviantart.com/")) {

        client.channels.cache.get(message.channelId).send(message.content.replace("deviantart", "fixdeviantart"));
        message.delete();
    }
});

// start bot
client.login(token);
