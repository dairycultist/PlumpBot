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

const { Client, Events, GatewayIntentBits, EmbedBuilder } = require("discord.js"); // npm install discord.js
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

    if (!message.content.includes(" ") && message.content.startsWith("https://www.deviantart.com/")) {

        fetch(message.content.replace("deviantart", "fixdeviantart"))
        .then(response => {
            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`);
            return response.text(); // or .json()
        })
        .then(data => {

            const image = /<meta property="og:image" content="([^"]*)">/.exec(data)[1];
            const title = /<meta property="og:title" content="([^"]*)">/.exec(data)[1];

            const exampleEmbed = {
                color: 0x05CC46,
                title: title,
                url: message.content,
                author: {
                    name: "DeviantArt",
                    icon_url: "https://images.icon-icons.com/2972/PNG/512/deviantart_logo_icon_186874.png"
                },
                image: { url: image },
                footer: {
                    text: "Sent by " + message.author.displayName,
                    icon_url: message.author.avatarURL()
                },
            };

            client.channels.cache.get(message.channelId).send({ embeds: [exampleEmbed] });
            message.delete();
            
        })
        .catch(error => {
            console.error("There was a problem with the fetch operation: ", error);
        });
    }
});

// start bot
client.login(token);
