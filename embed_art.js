
function attemptEmbedArtFromMessage(client, message) {

    if (!message.content.includes(" ")) { // no need to trim, Discord does it for us

        if (message.content.startsWith("https://www.deviantart.com/")) {

            fetchCallback(message.content.replace("deviantart", "fixdeviantart"), (html) => {

                const image = parseMeta(html, "og:image");
                const title = parseMeta(html, "og:title").replaceAll("&apos;", "'");
                const description = parseMeta(html, "og:description").replaceAll("&apos;", "'");

                embedArt(
                    client,
                    message,
                    "DeviantArt",
                    "https://images.icon-icons.com/2972/PNG/512/deviantart_logo_icon_186874.png",
                    0x05CC46,
                    title,
                    description,
                    message.content,
                    image
                );
            });

        } else if (message.content.includes("/status/") && (message.content.startsWith("https://twitter.com/") || message.content.startsWith("https://x.com/"))) {

            // https://x.com/53hank/status/1951368034310103293
            // https://twitter.com/VeryFilthyThing/status/1951406765305676282
            // Twitter embeds don't work right now since Twitter sucks and wants me to poll its API
            client.channels.cache.get(message.channelId).send(message.content.replace("x", "fixvx").replace("twitter", "fixvx"));
            message.delete();

        } else if (message.content.includes("/post/") && message.content.startsWith("https://bsky.app/profile/")) {

            fetchCallback(message.content, (html) => {

                const image = parseMeta(html, "og:image");
                const title = parseMeta(html, "og:title").replaceAll("&apos;", "'");
                const description = parseMeta(html, "og:description").replaceAll("&apos;", "'");

                // https://docs.bsky.app/docs/api/app-bsky-feed-get-posts

                // https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=URI_FROM_LINK_BELOW

                // <link rel="alternate" href="at://did:plc:ha27j5253cvi5s4mjdcxuzo3/app.bsky.feed.post/3lk54j7zz6s2u" />

                embedArt(
                    client,
                    message,
                    "Bluesky",
                    "https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg",
                    0x4F9BD9,
                    title,
                    description,
                    message.content,
                    image
                );
            });

        } else if (message.content.includes("/artworks/") && message.content.startsWith("https://www.pixiv.net/")) {

            // Pixiv needs an API request to get the full image (otherwise it's cropped), see: https://stackoverflow.com/questions/69592843/how-to-fetch-image-from-api

            client.channels.cache.get(message.channelId).send(message.content.replace("pixiv", "phixiv"));
            message.delete();

            // embedArt(
            //     client,
            //     message,
            //     "Pixiv",
            //     "https://static.wikia.nocookie.net/logopedia/images/6/65/Pixiv_2010s_%28Add_icon%29.png",
            //     0x0096FA,
            //     message.content,
            //     message.content
            // );
        }
    }
};

function parseMeta(data, property) {

    const result = new RegExp(`<meta property="${ property }" content="([^"]*)"(?: data-next-head="")?(?:\/)?>`).exec(data);

    if (result)
        return result[1];

    return "";
}

function fetchCallback(url, callback) {

    fetch(url)
    .then(response => {
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
    })
    .then(html => {
        callback(html);
    })
    .catch(error => {
        console.error("There was a problem with the fetch operation: ", error);
    });
}

function embedArt(client, message, siteName, siteImg, color, title, description, url, image) {

    const embed = {
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

    client.channels.cache.get(message.channelId).send({ embeds: [ embed ] });
    message.delete();
}

module.exports = {
    attemptEmbedArtFromMessage: attemptEmbedArtFromMessage
};