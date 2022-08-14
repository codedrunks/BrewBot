import { Client } from "discord.js";
import dotenv from "dotenv";
import k from "kleur";
import { allOfType, system, Stringifiable } from "svcorelib";

import persistentData from "@src/persistentData";
import botLogs from "@src/botLogs";
import { initRegistry, registerGuildCommands, registerEvents, getCommands, btnPressed, modalSubmitted } from "@src/registry";
import { commands as slashCmds } from "@src/commands";
import { settings } from "@src/settings";
import { prisma } from "@database/client";
import { doContestStuff } from "@commands/fun/Contest/functions";
import { lavaRetrieveClient, clientReadyInitLava, clientUpdateVoiceStateLava } from "@src/lavalink/client";
import { getRedis } from "@src/redis";
import { registerFont } from "canvas";

const { env, exit } = process;

dotenv.config();

async function init()
{
    console.log("Initializing...\n");

    if(!allOfType([ env.BOT_TOKEN, env.CLIENT_ID ], "string"))
        throw new Error("Missing environment variable(s). Please correct them according to the .env.template");

    registerFont("assets/external/fonts/Roboto-Bold.ttf", {family: "Roboto"});
    registerFont("assets/external/fonts/ChrysanthiUnicode-Regular.ttf", {family: "Chrysanthi Unicode"});
    registerFont("assets/external/fonts/NotoSans-Regular.ttf", {family: "Noto Sans"});

    await persistentData.init();

    const client = new Client({
        intents: settings.client.intents,
    });

    lavaRetrieveClient(client);

    client.login(env.BOT_TOKEN ?? "ERR_NO_ENV");

    client.on("ready", async (cl) => {
        const { user, guilds } = cl;

        user.setPresence({
            status: "dnd",
            activities: [{ type: "PLAYING", name: "starting up..." }]
        });
        
        await getRedis().connect();
        
        botLogs.init(cl);
        
        initRegistry(cl);

        const evts = registerEvents().filter(e => e.enabled);

        console.log(`• Registered ${k.green(evts.length)} client event${evts.length != 1 ? "s" : ""}`);
        printDbgItmList(evts.map(e => e.constructor.name ?? e.names.join("&")));

        await registerCommands(cl);

        user.setPresence({
            status: "online",
            activities: [{ type: "WATCHING", name: "ur mom" }],
        });

        console.log(`• Active in ${k.green(guilds.cache.size)} guild${guilds.cache.size != 1 ? "s" : ""}`);

        await doContestStuff(cl);

        clientReadyInitLava(cl);

        printDbgItmList(guilds.cache.map(g => g.name), 4);

        await doContestStuff(cl);

        console.log(k.green(`\n${user.username} is ready.\n`));

        process.stdin.isTTY && awaitKeypress();

        ringBell();
    });

    client.on("error", err => {
        console.error(`${k.red("Client error:")}\n${err}`);
    });

    client.on("raw", (d) => {
        clientUpdateVoiceStateLava(d);
    });


    ["SIGINT", "SIGTERM"].forEach(sig => process.on(sig, async () => {
        console.log("Shutting down...");

        await prisma.$disconnect();

        client.user?.setPresence({ status: "dnd", activities: [{ type: "PLAYING", name: "shutting down..." }] });
        client.user?.setPresence({ status: "invisible", activities: [{ type: "PLAYING", name: "shutting down..." }] });

        setTimeout(() => exit(0), 100);
    }));
}

async function awaitKeypress()
{
    const key = await system.pause(`Actions: E${k.red("[x]")}it`);

    switch(key)
    {
    case "x":
        return process.exit(0);
    }

    awaitKeypress();
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

        console.log(`• Registered ${k.green(slashCmds.length)} slash command${slashCmds.length != 1 ? "s" : ""}`);
        printDbgItmList(cmds.map(c => c.meta.name));

        client.on("interactionCreate", async (int) => {
            if(int.isCommand())
            {
                const { commandName, options } = int;

                const opts = options.data && options.data.length > 0 ? options.data : undefined;

                const cmd = cmds.find(({ meta }) => meta.name === commandName);

                if(!cmd || !cmd.enabled)
                    return;

                await cmd.tryRun(int, Array.isArray(opts) ? opts[0] : opts);
            }
            else if(int.isButton()) {
                await btnPressed(int);
            }
            else if(int.isModalSubmit()) {
                await modalSubmitted(int);
            }
        });
    }
    catch(err: unknown)
    {
        console.error(k.red("Error while listening for slash commands:\n") + k.red(err instanceof Error ? String(err) : "Unknown Error"));
    }
}

/** Prints a styled list of items to the console * @param limit Max amount of items per line */
function printDbgItmList(list: string[] | Stringifiable[], limit = 6)
{
    let msg = "";

    list = list.map(itm => itm.toString()).sort();

    while(list.length > 0)
    {
        const items = list.splice(0, limit);
        msg += `│ ${k.gray(`${items.join(", ")}${items.length === 8 ? "," : ""}`)}\n`;
    }

    console.log(msg);
}

/** Triggers the console bell sound */
function ringBell()
{
    settings.debug.bellOnReady && process.stdout.write("\u0007");
}

init();
