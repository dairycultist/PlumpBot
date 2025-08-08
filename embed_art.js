var m3u8ToMp4 = require("m3u8-to-mp4");
var converter = new m3u8ToMp4();

const platforms = [
    /*
     * DEVIANTART
     */
    {
        regex: new RegExp("^https://www.deviantart.com/"),
        embed: (client, message, response) => {
            
            const url = "https://backend.deviantart.com/oembed?url=" + message.content.replaceAll(":", "%3A").replaceAll("/", "%2F");
            // console.log(url);

            fetchCallback(url, true, (json) => {

                embedArt(client, message, response, {
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
        }
    },
    /*
     * TWITTER / X
     */
    {
        regex: new RegExp("^https://(twitter|x).com/.+/status/"),
        embed: (client, message, response) => {
            
            // https://x.com/53hank/status/1951368034310103293
            // https://twitter.com/VeryFilthyThing/status/1951406765305676282
            // Twitter embeds don't work right now since Twitter sucks and wants me to poll its API
            response.edit(message.content.replace("x", "fixvx").replace("twitter", "fixvx"));
        }
    },
    /*
     * BSKY
     */
    {
        regex: new RegExp("^https://bsky.app/profile/.+/post/"),
        embed: (client, message, response) => {
            
            fetchCallback(message.content, false, (html) => {

                const url = "https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=" + parseLink(html, "alternate");
                // console.log(url);

                // https://docs.bsky.app/docs/api/app-bsky-feed-get-posts
                fetchCallback(url, true, async (json) => {

                    const authorDID = json.posts[0].author.did.replaceAll(":", "%3A");

                    var video_local_path = "";
                    var images = [];

                    // reposts are internally different which is annoying but whatever

                    if (json.posts[0].embed["$type"] == "app.bsky.embed.recordWithMedia#view") {

                        // video post
                        video_local_path = "./bsky.mp4";

                        await converter
                            .setInputFile(json.posts[0].embed.media.playlist) // url to M3U8 stream file, converter saves it to mp4 locally
                            .setOutputFile(video_local_path)
                            .start();

                    } else if (json.posts[0].embed["$type"] == "app.bsky.embed.video#view") {

                        // video REpost
                        video_local_path = "./bsky.mp4";

                        await converter
                            .setInputFile(json.posts[0].embed.playlist)
                            .setOutputFile(video_local_path)
                            .start();

                    } else {

                        if (json.posts[0].record.embed.images)
                            for (const imageObject of json.posts[0].record.embed.images)
                                images.push(`https://cdn.bsky.app/img/feed_fullsize/plain/${ authorDID }/${ imageObject.image.ref["$link"] }@png`);
                    }

                    embedArt(client, message, response, {
                        site: {
                            name: "Bluesky",
                            img: "https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg",
                            color: 0x4F9BD9,
                        },
                        title: json.posts[0].record.text.split("\n")[0],
                        description: json.posts[0].record.text,
                        url: message.content,
                        author: json.posts[0].author.displayName,
                        images: images,
                        video: {
                            local_path: video_local_path
                        }
                    });
                });
            });
        }
    },
    /*
     * PIXIV
     */
    {
        regex: new RegExp("^https://www.pixiv.net/.+/artworks/"),
        embed: (client, message, response) => {
            
            // API guide: https://stackoverflow.com/questions/69592843/how-to-fetch-image-from-api

            const url = "https://api.adoreanime.com/api/pixiv/?type=illust&id=" + message.content.split("/").pop();
            // console.log(url);

            // convert ugoira file to video, then send video file CONTENTS to Discord? then delete locally
            // https://ugoira.com/
            // https://github.com/mikf/ugoira-conv
            // https://codeberg.org/tocariimaa/ugoira-tool

            fetchCallback(url, true, (json) => {

                let images = [];

                if (json.illust.meta_pages.length == 0) {

                    images.push(json.illust.meta_single_page.original_image_url.replace("pximg.net", "pixiv.cat"));

                } else {

                    // add images (given there are multiple), but only the first six
                    for (let i = 0; i < Math.min(6, json.illust.meta_pages.length); i++)
                        images.push(json.illust.meta_pages[i].image_urls.original.replace("pximg.net", "pixiv.cat"));
                }

                embedArt(client, message, response, {
                    site: {
                        name: "Pixiv",
                        img: "https://static.wikia.nocookie.net/logopedia/images/6/65/Pixiv_2010s_%28Add_icon%29.png",
                        color: 0x0096FA
                    },
                    title: json.illust.title,
                    url: message.content,
                    author: json.illust.user.name,
                    images: images,
                    image_count: json.illust.page_count
                });
            });
        }
    },
    /*
     * FURAFFINITY
     */
    {
        regex: new RegExp("^https://www.furaffinity.net/view/"),
        embed: (client, message, response) => {

            response.edit(message.content.replace("furaffinity", "fxfuraffinity"));
        }
    },
];

async function attemptEmbedArtFromMessage(client, message) {

    if (message.content.includes(" ")) // no need to trim, Discord does it for us
        return;

    let response;

    for (const platform of platforms) {

        if (platform.regex.test(message.content)) {

            message.delete();
            response = await client.channels.cache.get(message.channelId).send(`Processing <${ message.content }>`);

            platform.embed(client, message, response);

            return;
        }
    }
};

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

function embedArt(client, message, response, post) {

    // {
    //     site: {
    //         name: "",
    //         img: "",
    //         color: 0
    //     },
    //     title: "",
    //     description: "",
    //     url: "",
    //     author: "",
    //     images: [ "", "" ],
    //     image_count: 2, // the images array may not reflect the actual amount of images in the post if we limited the amount to embed
    //     video: {
    //         length: 10,
    //         url: "",
    //         local_path: ""
    //     }
    // }

    let fields = [];

    if (post.author)
        fields.push({ name: "Author", value: post.author, inline: true });

    if (post.image_count)
        fields.push({ name: "Total images", value: post.image_count, inline: true });

    // eventually add video length stat to the embed

    const embed = {
        author: {
            name: post.site.name,
            icon_url: post.site.img
        },
        color: post.site.color,
        title: post.title,
        description: post.description,
        fields: fields,
        url: post.url,
        image: post.images.length == 1 ? { url: post.images[0] } : undefined, // only put an image in the embed if it's the ONLY image
        footer: {
            text: "Sent by " + message.author.displayName,
            icon_url: message.author.avatarURL()
        },
    };

    let files = [];

    // attach video FILE above embed (video LINK should be set as image of embed)
    if (post.video && post.video.local_path) {

        files.push({ attachment: post.video.local_path });
    }

    // attach images above the embed if there are multiple
    if (post.images.length > 1) {

        for (const image of post.images)
            files.push({ attachment: image });
    }

    response.edit({
        content: "",
        embeds: [ embed ],
        files: files
    });
}

module.exports = {
    attemptEmbedArtFromMessage: attemptEmbedArtFromMessage
};