# PlumpBot

A Discord bot for my awesome Discord server.

## Features

- Converts DeviantArt, Pixiv, Bluesky, Twitter/X, and Furaffinity links to embeds.
- AI art generation (with separate Paperspace backend).
- Simple welcome command with verification message.

*There's also a feature that automatically puts up your Paperspace notebook, but it's specific to my usecase so you'd need to modify the code to make it work for you. I might update it later.*

## Dependencies

I'm assuming you're using the Ubuntu package manager `apt` since that's what I'm using.

```
sudo apt update
sudo apt install nodejs npm
npm install discord.js
sudo apt install ffmpeg
npm install m3u8-to-mp4
npm install readline-sync
```

## Paperspace and WebUI API

The `/draw` command interacts with a Paperspace notebook (which you can set up with [this tutorial](https://github.com/dairycultist/PaperspaceStableDiffusion)).

Make sure to run `./webui.sh --api` instead of `./webui.sh` when starting the WebUI to enable the API endpoints.