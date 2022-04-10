import { Client } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

function init()
{
    const client = new Client({
        intents: [],
    });

    client.login(process.env.BOT_TOKEN);

    client.on("ready", ({ user, guilds }) => {
        console.log(`${user.username} is ready in ${guilds.cache.size} guilds.`);
    });
}

init();
