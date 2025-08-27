const { MessageFlags, SlashCommandBuilder, PermissionFlagsBits, REST, Routes, AttachmentBuilder } = require("discord.js");

// mini goal is to have the bot take in a paperspace key as part of the config, and having a "start drawing backend" and "stop drawing backend" command, creating the notebook, starting it, and storing the gradio link
// then we can remove the slightly cumbersome setgradioid command, and I also don't have to open paperspace to start the drawing

let gradioID = undefined;
let genQueue = [];
let genCurrent = undefined;

// queues the generation and fetches when it's its turn. await on this!
async function generateImage(prompt) {

    // instead of polling the API immediately for every drawing request (and overwhelming it/having requests dropped), we have a queueing system
    // since the API fetch automatically drops (after the time it takes to gen ~3.5 images) if it's open for too long (even if we extend the fetch's timeout)

    // queue this prompt
    genQueue.push(prompt);

    // wait until nothing it currently being generated AND we're next in queue
    while (genCurrent || genQueue[0] != prompt) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // set ourselves as what's currently being generated
    genCurrent = genQueue.shift();

    // do API request (text to image endpoint <GRADIO_LIVE_URL>/docs#/default/text2imgapi_sdapi_v1_txt2img_post)
    // we don't batch multiple since it has a chance of returning 504
    const response = await fetch(`https://${ gradioID }.gradio.live/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            "prompt":           prompt.pos,
            "negative_prompt":  prompt.neg,
            "seed":             prompt.seed,
            // sampler_name: null,
            // scheduler: null,
            "steps":            30,
            // cfg_scale: 7,
            "width":            prompt.width,
            "height":           prompt.height,
            // "sampler_index": "Euler",
            "send_images":      true,
            "save_images":      false
        })
    });

    // show we're done generating so the next in queue can start
    genCurrent = undefined;

    // process response
    if (!response.ok) {
        throw new Error(response.status);
    };

    const json = await response.json();

    // TODO include json.info as metadata in the image

    return new AttachmentBuilder(Buffer.from(json.images[0], "base64"), { name: "image.png" });
}

const commands = [
    {
        data: new SlashCommandBuilder()
            .setName("setgradioid")
            .setDescription("Set (or clear) the ID of the gradio sharelink to make requests to.")
            .addStringOption(option => option.setName("id").setDescription("https://<THIS_PART>.gradio.live/ OR leave empty to clear gradio ID."))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON(),
        execute: async (interaction, getArgValue) => {

            // appropriately set gradio ID
            gradioID = getArgValue("id");

            if (gradioID) {
                await interaction.reply({ content: `Set gradio link to https://${ gradioID }.gradio.live/.`, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: `Cleared gradio link.`, flags: MessageFlags.Ephemeral });
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName("getgradiolink")
            .setDescription("Get the active gradio sharelink.")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON(),
        execute: async (interaction, getArgValue) => {

            if (gradioID) {
                await interaction.reply({ content: `https://${ gradioID }.gradio.live/.`, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: `No gradio ID set.`, flags: MessageFlags.Ephemeral });
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName("draw")
            .setDescription("Generate an image using Paperspace.")
            .addStringOption(option => option.setName("pos").setDescription("Positive prompt.").setRequired(true))
            .addStringOption(option => option.setName("neg").setDescription("Negative prompt."))
            .addStringOption(option => option.setName("size").setDescription("Resulting image size (defaults to square).").addChoices(
                { name: "square", value: "1200x1200" },
                { name: "tall", value: "1000x1600" },
                { name: "wide", value: "1600x1000" }
            ))
            .addStringOption(option => option.setName("type").setDescription("Special prompt features (defaults to single).").addChoices(
                { name: "single", value: "single" },
                { name: "single but huge", value: "singlehuge" },
                { name: "batch of 4", value: "batch4" },
                { name: "progression", value: "progression" },
                { name: "sudden expansion", value: "suddenexpansion" }
            ))
            .toJSON(),
        execute: async (interaction, getArgValue) => {

            // if a gradio ID isn't even set, there's no chance the API request will work
            if (!gradioID) {

                await interaction.reply({ content: "Drawing is currently offline. Ping the owner to have them set it up.", flags: MessageFlags.Ephemeral });
                return;
            }

            if (getArgValue("type") == "progression" && !getArgValue("pos").includes("SIZE")) {

                await interaction.reply({ content: "Since you're using `type=progression`, you must use the keyword `SIZE` in your prompt.\n\nExample: `1girl, SIZE breasts, red dress`", flags: MessageFlags.Ephemeral });
                // await interaction.reply({ content: "Since you're using `type=progression`, include one or more of `BELLY, HIPS, THIGHS, BOOBS` to have that bodypart grow as part of the progression.", flags: MessageFlags.Ephemeral });
                return;
            }

            if (getArgValue("type") == "suddenexpansion" && !getArgValue("pos").includes("SIZE")) {

                await interaction.reply({ content: "Since you're using `type=suddenexpansion`, include one or more of `BELLY, HIPS, THIGHS, BOOBS` to have that bodypart grow as part of the sudden expansion. **Also, do NOT use any prompts referring to the direction the character is looking or their mood (this is inserted automatically).**", flags: MessageFlags.Ephemeral });
                return;
            }

            // tell Discord to wait
            await interaction.deferReply();
            
            try {

                let images = [];
                const w = getArgValue("size") ? parseInt(getArgValue("size").split("x")[0]) : 1200;
                const h = getArgValue("size") ? parseInt(getArgValue("size").split("x")[1]) : 1200;

                if (getArgValue("type") == "suddenexpansion") {

                    const seed = Math.floor(Math.random() * 999999);

                    images.push((await generateImage({
                        pos: getArgValue("pos").replaceAll("BELLY", "flat stomach").replaceAll("HIPS", "narrow hips").replaceAll("THIGHS", "thin thighs").replaceAll("BOOBS", "flat chest") + ", (relaxed, looking at viewer)",
                        neg: getArgValue("neg"),
                        seed: seed,
                        width: w,
                        height: h
                    })));

                    images.push((await generateImage({
                        pos: getArgValue("pos").replaceAll("BELLY", "huge belly, fat belly, bbw").replaceAll("HIPS", "wide hips").replaceAll("THIGHS", "thick thighs").replaceAll("BOOBS", "huge breasts, bursting breasts") + ", (shocked, looking down at body, leaning back, motion lines, expansion)",
                        neg: getArgValue("neg"),
                        seed: seed,
                        width: w,
                        height: h
                    })));

                } else if (getArgValue("type") == "progression") {

                    // TODO if one of the images fails, still send the ones we already made

                    const seed = Math.floor(Math.random() * 999999);

                    images.push((await generateImage({
                        pos: getArgValue("pos").replaceAll("SIZE", "medium"),
                        neg: getArgValue("neg"),
                        seed: seed,
                        width: w,
                        height: h
                    })));

                    images.push((await generateImage({
                        pos: getArgValue("pos").replaceAll("SIZE", "large"),
                        neg: getArgValue("neg"),
                        seed: seed,
                        width: w,
                        height: h
                    })));

                    images.push((await generateImage({
                        pos: getArgValue("pos").replaceAll("SIZE", "huge"),
                        neg: getArgValue("neg"),
                        seed: seed,
                        width: w,
                        height: h
                    })));

                    images.push((await generateImage({
                        pos: getArgValue("pos").replaceAll("SIZE", "gigantic"),
                        neg: getArgValue("neg"),
                        seed: seed,
                        width: w,
                        height: h
                    })));

                } else if (getArgValue("type") == "batch4") {

                    for (let i = 0; i < 4; i++) {

                        images.push(await generateImage({
                            pos: getArgValue("pos"),
                            neg: getArgValue("neg"),
                            seed: -1,
                            width: w,
                            height: h
                        }));
                    }

                } else if (getArgValue("type") == "singlehuge") {

                    images.push(await generateImage({
                        pos: getArgValue("pos"),
                        neg: getArgValue("neg"),
                        seed: -1,
                        width: w * 3 / 2,
                        height: h * 3 / 2
                    }));

                } else {

                    images.push(await generateImage({
                        pos: getArgValue("pos"),
                        neg: getArgValue("neg"),
                        seed: -1,
                        width: w,
                        height: h
                    }));
                }

                // update our response with the image
                interaction.editReply({ files: images });

            } catch (error) {

                interaction.editReply(`Something went wrong (${ error }), please try again. If this *keeps happening*, ping the owner.`);
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName("loras")
            .setDescription("Get all loras (which you can copy into your prompt).")
            .toJSON(),
        execute: async (interaction, getArgValue) => {

            // if a gradio ID isn't even set, there's no chance the API request will work
            if (!gradioID) {

                await interaction.reply({ content: "Drawing is currently offline. Ping the owner to have them set it up.", flags: MessageFlags.Ephemeral });
                return;
            }

            // fetch loras
            fetch(`https://${ gradioID }.gradio.live/sdapi/v1/loras`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(response.status + " " + response.statusText);
                }
                return response.json();
            })
            .then(json => {

                let construct = "";

                for (const lora of json) {
                    construct += `\`<lora:${ lora.alias }:1>\`\n`;
                }

                interaction.reply({ content: construct, flags: MessageFlags.Ephemeral });
            })
            .catch(error => {
                interaction.reply({ content: `There was a problem with the fetch operation: ${ error }`, flags: MessageFlags.Ephemeral });
            });
        }
    }
];

// asynchronously deploy commands via rest module
function attemptRedeployCommands(token, clientID) {

    const redeploy = require("readline-sync").question("Should we redeploy commands? (May be throttled if you do it too often) [y/N]");

    if (redeploy.trim().toLowerCase() == "y") {

        (async () => {
            try {

                // AI image commands can be run in any channel right now
                // add a /allowdraw and /disallowdraw command to tell the bot where you can gen (that also means I need non-volatile storage server-side, ugh)
                // it'll default to disallowed

                let commandData = [];

                for (const command of commands) {
                    commandData.push(command.data);
                }

                const rest = new REST().setToken(token);

                console.log(`Started refreshing ${ commandData.length } commands.`);

                // the put method is used to fully refresh all commands in the guild with the current set
                const data = await rest.put(
                    Routes.applicationCommands(clientID),
                    { body: commandData },
                );

                console.log(`Successfully reloaded ${ data.length } commands.`);

            } catch (error) {
                console.error(error);
            }
        })();
    }
}

module.exports = {
    commands: commands,
    attemptRedeployCommands: attemptRedeployCommands,
};