
function attemptEmbedArtFromMessage(client, message) {

    if (!message.content.includes(" ")) { // no need to trim, Discord does it for us

        if (message.content.startsWith("https://www.deviantart.com/")) {

            embedArt(
                client,
                message,
                "DeviantArt",
                "https://images.icon-icons.com/2972/PNG/512/deviantart_logo_icon_186874.png",
                0x05CC46,
                message.content,
                message.content.replace("deviantart", "fixdeviantart")
            );

        } else if (message.content.includes("/status/") && (message.content.startsWith("https://twitter.com/") || message.content.startsWith("https://x.com/"))) {

            // https://x.com/53hank/status/1951368034310103293
            // https://twitter.com/VeryFilthyThing/status/1951406765305676282
            client.channels.cache.get(message.channelId).send("Twitter embeds don't work right now since Twitter sucks and wants me to poll its API. Sorry!");

        } else if (message.content.includes("/post/") && message.content.startsWith("https://bsky.app/profile/")) {

            embedArt(
                client,
                message,
                "Bluesky",
                "https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg",
                0x4F9BD9,
                message.content,
                message.content
            );

        } else if (message.content.includes("/artworks/") && message.content.startsWith("https://www.pixiv.net/")) {

            embedArt(
                client,
                message,
                "Pixiv",
                "https://static.wikia.nocookie.net/logopedia/images/6/65/Pixiv_2010s_%28Add_icon%29.png",
                0x0096FA,
                message.content,
                message.content
            );
        }
    }
};

function parseMeta(data, property) {

    const result = new RegExp(`<meta property="${ property }" content="([^"]*)"(?: data-next-head="")?(?:\/)?>`).exec(data);

    if (result)
        return result[1];

    return "";
}

function embedArt(client, message, siteName, siteImg, color, url, fixUrl) {

    fetch(fixUrl)
    .then(response => {
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
    })
    .then(data => {

        console.log(data); // for testing

        const image = parseMeta(data, "og:image");
        const title = parseMeta(data, "og:title").replaceAll("&apos;", "'");
        const description = parseMeta(data, "og:description").replaceAll("&apos;", "'");

        const exampleEmbed = {
            color: color,
            title: title,
            url: url,
            author: {
                name: siteName,
                icon_url: siteImg
            },
            description: description,
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

module.exports = {
    attemptEmbedArtFromMessage: attemptEmbedArtFromMessage
};