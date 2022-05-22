import { Client } from "discord.js";
import dotenv from "dotenv";
import k from "kleur";
import { allOfType } from "svcorelib";

import persistentData from "./persistentData";
import botLogs from "./botLogs";
import { initRegistry, registerGuildCommands, registerEvents, getCommands } from "./registry";
import { commands as slashCmds } from "./commands";
import { settings } from "./settings";

// TODO: figure out something better
const firstLaunch = false;

const { env, exit } = process;

dotenv.config();


async function init()
{
    console.log("Initializing...\n");

    if(!allOfType([ env.BOT_TOKEN, env.CLIENT_ID ], "string"))
        throw new Error("Missing environment variable(s). Please correct them according to the .env.template");

    await persistentData.init();


    const client = new Client({
        intents: settings.client.intents,
    });

    client.login(env.BOT_TOKEN ?? "ERR_NO_ENV");


    client.on("ready", async (cl) => {
        const { user, guilds } = cl;

        user.setPresence({
            status: "dnd",
            activities: [{ type: "PLAYING", name: "starting up..." }]
        });

        firstLaunch && await user.setAvatar("./assets/avatar.png");


        botLogs.init(cl);

        initRegistry(cl);


        await registerCommands(cl);
        const evtAmt = await registerEvents();

        evtAmt && console.log(`• Registered ${k.green(evtAmt)} client event${evtAmt != 1 ? "s" : ""}`);


        user.setPresence({
            status: "online",
            activities: [{ type: "WATCHING", name: "ur mom" }],
        });

        console.log(`\n${user.username} is ready in ${k.green(guilds.cache.size)} guild${guilds.cache.size != 1 ? "s" : ""}`);
    });

    client.on("error", err => {
        console.error(`${k.red("Client error:")}\n${err}`);
    });


    ["SIGINT", "SIGTERM"].forEach(sig => process.on(sig, async () => {
        console.log("Shutting down...");

        await client.user?.setPresence({
            status: "dnd",
            activities: [{ type: "PLAYING", name: "shutting down..." }]
        });

        exit(0);
    }));
}

/**
 * Registers all the bot's slash commands  
 * What gets registered is defined by the `index.ts` in the `commands` folder
 */
async function registerCommands(client: Client)
{
    
    try
    {
        // register guild commands
        // see https://discordjs.guide/interactions/slash-commands.html#guild-commands

        const guilds = client.guilds.cache.map(g => g.id);

        await registerGuildCommands(guilds);

        console.log(`• Registered ${k.green(slashCmds.length)} slash command${slashCmds.length != 1 ? "s" : ""} in ${k.green(guilds.length)} guild${guilds.length != 1 ? "s" : ""} each`);
    }
    catch(err)
    {
        console.error(k.red("Error while registering commands:\n") + (err instanceof Error) ? String(err) : "Unknown Error");
    }

    try
    {
        // listen for slash commands

        const cmds = getCommands();

        if(!cmds)
            throw new Error("No commands found to listen to");

        client.on("interactionCreate", async (int) => {
            if(!int.isCommand())
                return;

            const { commandName, options } = int;

            const opts = options.data && options.data.length > 0 ? options.data : undefined;

            const cmd = cmds.find(({ meta }) => meta.name === commandName);

            if(!cmd || !cmd.enabled)
                return;

            await cmd.tryRun(int, Array.isArray(opts) ? opts[0] : opts);
        });
    }
    catch(err: unknown)
    {
        console.error(k.red("Error while listening for slash commands:\n") + k.red(err instanceof Error ? String(err) : "Unknown Error"));
    }
}

init();
