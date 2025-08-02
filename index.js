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

// https://www.pixiv.net/en/artworks/133419030
// https://x.com/53hank/status/1951368034310103293
// https://bsky.app/profile/ciel-goat.bsky.social/post/3lvf4kodkus2r
// https://twitter.com/VeryFilthyThing/status/1951406765305676282

// message handling
client.on(Events.MessageCreate, message => {

    if (message.author.bot) { return; }

    console.log("'" + message.content + "'");

    if (!message.content.includes(" ")) {

        if (message.content.startsWith("https://www.deviantart.com/")) {

            inlineEmbedArt(
                "DeviantArt",
                "https://images.icon-icons.com/2972/PNG/512/deviantart_logo_icon_186874.png",
                0x05CC46,
                message.content,
                message.content.replace("deviantart", "fixdeviantart")
            );
        }
    }
});

function inlineEmbedArt(siteName, siteImg, color, url, fixUrl) {

    fetch(fixUrl)
    .then(response => {
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
    })
    .then(data => {

        const image = /<meta property="og:image" content="([^"]*)">/.exec(data)[1];
        const title = /<meta property="og:title" content="([^"]*)">/.exec(data)[1];

        const exampleEmbed = {
            color: color,
            title: title,
            url: url,
            author: {
                name: siteName,
                icon_url: siteImg
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

// start bot
client.login(token);
