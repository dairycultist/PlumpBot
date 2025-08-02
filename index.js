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

    if (message.content.startsWith("https://www.deviantart.com/")) {

        fetch(message.content.replace("deviantart", "fixdeviantart"))
        .then(response => {
            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`);
            return response.text(); // or .json()
        })
        .then(data => {

            // must parse this out of html
            /* <meta property="og:title" content="[Sketch]I Hope the MsPaint Doodles aren't Annoying by SquishyPsycho on DeviantArt">
            <meta property="og:image" content="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/fb7acd1c-4a42-4356-b5e1-ebb8e652de8b/dk9hf72-ac11a6dc-458b-4063-80c9-19f68d071e36.png/v1/fill/w_1038,h_770,q_70,strp/_sketch_i_hope_the_mspaint_doodles_aren_t_annoying_by_squishypsycho_dk9hf72-pre.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9Nzg1IiwicGF0aCI6IlwvZlwvZmI3YWNkMWMtNGE0Mi00MzU2LWI1ZTEtZWJiOGU2NTJkZThiXC9kazloZjcyLWFjMTFhNmRjLTQ1OGItNDA2My04MGM5LTE5ZjY4ZDA3MWUzNi5wbmciLCJ3aWR0aCI6Ijw9MTA1OSJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.JnlyjFz9686txhCey_4K9Zs8y5dde2Zcaa6FGH6RxmU"> */

            console.log(data);

            const exampleEmbed = {
                color: 0x05CC46,
                title: 'Some title',
                url: 'https://discord.js.org',
                author: {
                    name: 'Some name',
                    icon_url: 'https://i.imgur.com/AfFp7pu.png',
                    url: 'https://discord.js.org',
                },
                description: 'Some description here',
                thumbnail: {
                    url: 'https://i.imgur.com/AfFp7pu.png',
                },
                fields: [
                    {
                        name: 'Regular field title',
                        value: 'Some value here',
                    },
                    {
                        name: '\u200b',
                        value: '\u200b',
                        inline: false,
                    },
                    {
                        name: 'Inline field title',
                        value: 'Some value here',
                        inline: true,
                    },
                    {
                        name: 'Inline field title',
                        value: 'Some value here',
                        inline: true,
                    },
                    {
                        name: 'Inline field title',
                        value: 'Some value here',
                        inline: true,
                    },
                ],
                image: {
                    url: 'https://i.imgur.com/AfFp7pu.png',
                },
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Some footer text here',
                    icon_url: 'https://i.imgur.com/AfFp7pu.png',
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
