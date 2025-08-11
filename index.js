
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

const { Client, Collection, Events, GatewayIntentBits, MessageFlags, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require("discord.js");
const { attemptEmbedArtFromMessage } = require("./embed_art.js");
const token = getToken();
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

    // new SlashCommandBuilder()
    //         .setName("ping")
    // 		.setDescription("Replies with Pong!");

	if (!interaction.isChatInputCommand()) return;

	console.log(interaction);

    const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {

		await command.execute(interaction);

	} catch (error) {

		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

// message handling
client.on(Events.MessageCreate, message => {

    if (message.author.bot) { return; }

    attemptEmbedArtFromMessage(client, message);
});

// asynchronously deploy commands via rest module
(async () => {
	try {

        const commands = [
            {
                data: new SlashCommandBuilder()
                    .setName("ping")
                    .setDescription("Replies with Pong!"),
                execute: async (interaction) => {
                    await interaction.reply("Pong!");
                },
            }
        ];

        const rest = new REST().setToken(token);

		console.log(`Started refreshing ${ commands.length } application (/) commands.`);

		// the put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands("640580697534365697"), // client id (should put into config)
			{ body: commands },
		);

		console.log(`Successfully reloaded ${ data.length } application (/) commands.`);

	} catch (error) {
		console.error(error);
	}
})();

// start bot
client.login(token);
