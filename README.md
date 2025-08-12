# PlumpBot

A Discord bot for my awesome Discord server.

## Features

- Converts DeviantArt, Pixiv, Bluesky, Twitter/X, and Furaffinity links to embeds.
- AI art generation (with separate Paperspace backend).
- Simple welcome command with verification message.

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

The notebook automatically shuts down after 1 hour due to inactivity, even if you're using the API (so periodically pinging it doesn't help). To prevent this, create a script called `looper.ipynb` which contains the following code that endlessly prints to the console every minute.

```
import time

minutes = 0

while (1):
    print(str(minutes) + " minutes")
    time.sleep(60)
    minutes += 1
```

<!-- I might just put that at the end of my existing pylib but a new version specific to this bot('s repository) and clean up the imports -->