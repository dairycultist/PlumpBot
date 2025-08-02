function getToken() {

    try {
        return require("./config.json").token;
    } catch (error) {
        console.error("Please run:");
        console.error("echo '{ \"token\": \"<YOUR_TOKEN>\" }' > config.json");
        console.error("with the appropriate key!");
        process.exit(1);
    }
}

const { Client, Events, GatewayIntentBits } = require("discord.js"); // npm install discord.js
const token = getToken();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// executed once upon client ready
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// command handling
client.on(Events.InteractionCreate, interaction => {

	// if (!interaction.isChatInputCommand()) return;

	console.log(interaction);
});

// start bot
client.login(token);
