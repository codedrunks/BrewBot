import { ActivityType, ApplicationCommandType, Client, ComponentType, InteractionType } from "discord.js";
import dotenv from "dotenv";
import k from "kleur";
import { allOfType, system } from "svcorelib";

import botLogs from "@src/botLogs";
import { initRegistry, registerGuildCommands, registerEvents, getCommands, modalSubmitted, getCtxMenus, btnListener } from "@src/registry";
import { settings } from "@src/settings";
import { prisma } from "@database/client";
import { doContestStuff } from "@commands/fun/Contest/functions";
import { lavaRetrieveClient, clientReadyInitLava, clientUpdateVoiceStateLava } from "@src/lavalink/client";
import { getRedis } from "@src/redis";
import { registerFont } from "canvas";
import { autoPlural, printDbgItmList, ringBell } from "./utils";

const { env, exit } = process;

dotenv.config();

async function init()
{
    console.log("Initializing...\n");

    if(!allOfType([ env.BOT_TOKEN, env.CLIENT_ID ], "string"))
        throw new Error("Missing environment variable(s). Please correct them according to the .env.template");

    registerFont("src/assets/external/fonts/Roboto-Bold.ttf", {family: "Roboto"});
    registerFont("src/assets/external/fonts/ChrysanthiUnicode-Regular.ttf", {family: "Chrysanthi Unicode"});
    registerFont("src/assets/external/fonts/NotoSans-Regular.ttf", {family: "Noto Sans"});

    const client = new Client({
        intents: settings.client.intents,
    });

    lavaRetrieveClient(client);

    client.login(env.BOT_TOKEN ?? "ERR_NO_ENV");

    client.once("ready", async (cl) => {
        const { user, guilds } = cl;

        user.setPresence({
            status: "dnd",
            activities: [{ type: ActivityType.Playing, name: "starting up..." }]
        });

        await getRedis().connect();

        botLogs.init(cl);

        initRegistry(cl);

        const evts = registerEvents().filter(e => e.enabled);

        console.log(`• Registered ${k.green(evts.length)} client ${autoPlural("event", evts)}`);
        printDbgItmList(evts.map(e => e.constructor.name ?? e.names.join("&")));

        user.setPresence({
            status: "online",
            activities: [{ type: ActivityType.Watching, name: "ur mom" }],
        });

        await Promise.all([ registerCommands(cl), doContestStuff(cl) ]);

        console.log(`• Active in ${k.green(guilds.cache.size)} guild${guilds.cache.size != 1 ? "s" : ""}`);
        printDbgItmList(guilds.cache.map(g => g.name), 4);


        clientReadyInitLava(cl);

        console.log(k.green(`\n${user.username} is ready.\n`));

        process.stdin.isTTY && awaitKeypress();

        ringBell();
    });

    client.on("error", err => {
        console.error(`${k.red("Client error:")}\n${err}`);
    });

    client.on("raw", (d) => {
        if(settings.commands.musicEnabled)
            clientUpdateVoiceStateLava(d);
    });


    ["SIGINT", "SIGTERM"].forEach(sig => process.on(sig, async () => {
        console.log("Shutting down...");

        await prisma.$disconnect();

        client.user?.setPresence({ status: "dnd", activities: [{ type: ActivityType.Playing, name: "shutting down..." }] });

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
        process.exit(1);
    }

    try
    {
        // listen for slash commands

        const cmds = getCommands();
        const ctxMenus = getCtxMenus();

        if(!cmds)
            throw new Error("No commands found to listen to");

        const enabledCmds = cmds.filter(c => c.enabled);
        const ofText = enabledCmds.length != cmds.length ? ` (of ${cmds.length} total)` : "";

        console.log(`• Registered ${k.green(enabledCmds.length)} slash ${autoPlural("command", enabledCmds)}${ofText}`);
        printDbgItmList(enabledCmds.map(c => c.getFullCmdName(c.meta.name)));

        console.log(`• Registered ${k.green(ctxMenus.length)} context ${autoPlural("menu", ctxMenus)}`);
        printDbgItmList(ctxMenus.map(c => c.meta.name));

        client.on("interactionCreate", async (int) => {
            if(int.type === InteractionType.ApplicationCommand && int.commandType === ApplicationCommandType.ChatInput)
            {
                const { commandName, options } = int;

                const opts = options.data && options.data.length > 0 ? options.data : undefined;

                const cmd = cmds.find((cmd) => cmd.getFullCmdName(cmd.meta.name) === commandName);

                if(!cmd || !cmd.enabled)
                    return;

                await cmd.tryRun(int, Array.isArray(opts) ? opts[0] : opts);
            }
            else if(int.type === InteractionType.MessageComponent && int.componentType === ComponentType.Button)
                btnListener.emitBtnPressed(int);
            else if(int.type === InteractionType.ModalSubmit)
                await modalSubmitted(int);
            else if(int.type === InteractionType.ApplicationCommand) // It's implied that the type of command is either ApplicationCommandType.User or ApplicationCommandType.Message
            {
                const run = ctxMenus
                    .find(c => c.meta.name === int.commandName)
                    ?.tryRun(int);

                if(run instanceof Promise)
                    await run;
            }
        });
    }
    catch(err: unknown)
    {
        console.error(k.red("Error while listening for slash commands:\n") + k.red(err instanceof Error ? String(err) : "Unknown Error"));
    }
}

init();
