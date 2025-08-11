# PlumpBot

A Discord bot for my awesome Discord server.

## Dependencies

I'm assuming you're using the Ubuntu package manager `apt` since that's what I'm using.

```
sudo apt update
sudo apt install nodejs npm
npm install discord.js
sudo apt install ffmpeg
npm install m3u8-to-mp4
```

## Paperspace and WebUI API

The `/draw` command interacts with a Paperspace notebook (which you can set up with [this tutorial](https://github.com/dairycultist/PaperspaceStableDiffusion)).

Make sure to run `./webui.sh --api` instead of `./webui.sh` to enable the API endpoints.