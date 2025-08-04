
function attemptEmbedArtFromMessage(client, message) {

    if (message.content.includes(" ")) // no need to trim, Discord does it for us
        return;

    if (message.content.startsWith("https://www.deviantart.com/")) {

        const url = "https://backend.deviantart.com/oembed?url=" + message.content.replaceAll(":", "%3A").replaceAll("/", "%2F");

        // console.log(url);

        fetchCallback(url, true, (json) => {

            embedArt(client, message, {
                site: {
                    name: "DeviantArt",
                    img: "https://images.icon-icons.com/2972/PNG/512/deviantart_logo_icon_186874.png",
                    color: 0x05CC46
                },
                title: json.title,
                description: "By " + json.copyright._attributes.entity,
                url: message.content,
                images: [ json.type == "video" ? json.thumbnail_url : json.url ] // might be able to parse out video from json.html, check later
            });
        });

    } else if (message.content.includes("/status/") && (message.content.startsWith("https://twitter.com/") || message.content.startsWith("https://x.com/"))) {

        // https://x.com/53hank/status/1951368034310103293
        // https://twitter.com/VeryFilthyThing/status/1951406765305676282
        // Twitter embeds don't work right now since Twitter sucks and wants me to poll its API
        client.channels.cache.get(message.channelId).send(message.content.replace("x", "fixvx").replace("twitter", "fixvx"));
        message.delete();

    } else if (message.content.includes("/post/") && message.content.startsWith("https://bsky.app/profile/")) {

        fetchCallback(message.content, false, (html) => {

            const url = "https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=" + parseLink(html, "alternate");

            // console.log(url);

            // https://docs.bsky.app/docs/api/app-bsky-feed-get-posts
            fetchCallback(url, true, (json) => {

                const authorDID = json.posts[0].author.did.replaceAll(":", "%3A");

                var images = [];

                if (json.posts[0].record.embed["$type"] == "app.bsky.embed.recordWithMedia") {

                    // video, just put thumbnail since we don't support bsky video embedding rn
                    images.push(`https://video.bsky.app/watch/${ authorDID }/${ json.posts[0].record.embed.media.video.ref["$link"] }/thumbnail.jpg`);

                } else {

                    for (const imageObject of json.posts[0].record.embed.images)
                        images.push(`https://cdn.bsky.app/img/feed_fullsize/plain/${ authorDID }/${ imageObject.image.ref["$link"] }@png`);
                }

                embedArt(client, message, {
                    site: {
                        name: "Bluesky",
                        img: "https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg",
                        color: 0x4F9BD9,
                    },
                    title: parseMeta(html, "og:title").replaceAll("&apos;", "'"),
                    description: json.posts[0].record.text,
                    url: message.content,
                    images: images
                });
            });
        });

    } else if (message.content.includes("/artworks/") && message.content.startsWith("https://www.pixiv.net/")) {

        // Pixiv needs an API request to get the full image (otherwise it's cropped), see: https://stackoverflow.com/questions/69592843/how-to-fetch-image-from-api
        // "https://static.wikia.nocookie.net/logopedia/images/6/65/Pixiv_2010s_%28Add_icon%29.png"
        // 0x0096FA
        client.channels.cache.get(message.channelId).send(message.content.replace("pixiv", "phixiv"));
        message.delete();
    }
};

function parseMeta(html, property) {

    const result = new RegExp(`<meta property="${ property }" content="([^"]*)"(?: data-next-head="")? ?\/?>`).exec(html);

    return result ? result[1] : "";
}

function parseLink(html, rel) {

    const result = new RegExp(`<link rel="${ rel }" href="([^"]*)" ?\/?>`).exec(html);

    return result ? result[1] : "";
}

function fetchCallback(url, textToJson, callback) {

    fetch(url)
    .then(response => {
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
        if (textToJson)
            return response.json();
        else
            return response.text();
    })
    .then(data => callback(data))
    .catch(error => console.error("There was a problem fetching: ", error));
}

function embedArt(client, message, post) {

    // let examplePost = {
    //     site: {
    //         name: "",
    //         img: "",
    //         color: 0
    //     },
    //     title: "",
    //     description: "",
    //     url: "",
    //     images: [ "", "" ],
    //     video: {
    //         length: 10,
    //         url: ""
    //     }
    // };

    const embed = {
        author: {
            name: post.site.name,
            icon_url: post.site.img
        },
        color: post.site.color,
        title: post.title,
        description: post.description,
        url: post.url,
        image: post.images.length == 1 ? { url: post.images[0] } : undefined, // only put an image in the embed if it's the ONLY image
        footer: {
            text: "Sent by " + message.author.displayName,
            icon_url: message.author.avatarURL()
        },
    };

    var files = undefined;

    // attach images above the embed if there are multiple
    if (post.images.length > 1) {

        files = [];

        for (const image of post.images)
            files.push({ attachment: image, name: "image.png" }); // currently assuming the attachment is a png. this works for bsky since we get to choose (@png in url), but might be unstable later
    }

    client.channels.cache.get(message.channelId).send({
        embeds: [ embed ],
        files: files
    });
    message.delete();

    // TODO for posts that contain video, multiple images, or extended media in general, create a read-only thread and post them there (to prevent clutter)
    // maybe add stats to the embed, like video length or image count
}

module.exports = {
    attemptEmbedArtFromMessage: attemptEmbedArtFromMessage
};