import { Client } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";
import k from "kleur";
import { allOfType } from "svcorelib";

import persistentData from "./persistentData";
import botLogs from "./botLogs";
import { commands } from "./commands";
import { events } from "./events";
import { Command } from "./Command";
import { Event } from "./Event";

// TODO: figure out something better
const firstLaunch = false;

const { env, exit } = process;

dotenv.config();

const rest = new REST({
    version: "9"
}).setToken(env.BOT_TOKEN ?? "ERR_NO_ENV");


/** After `registerCommands()` finishes, this contains all command class instances */
const cmds: Command[] = [];
/** After `registerEvents()` finishes, this contains all event class instances */
const evts: Event[] = [];


async function init()
{
    console.log("Initializing...\n");

    await persistentData.init();
    await persistentData.set("startupTime", Date.now());

    if(!allOfType([ env.BOT_TOKEN, env.CLIENT_ID ], "string"))
        throw new Error("Missing environment variable(s). Please correct them according to the .env.template");

    const client = new Client({
        intents: [ "GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "GUILD_PRESENCES" ],
    });

    client.login(env.BOT_TOKEN ?? "ERR_NO_ENV");

    client.on("ready", async ({ user, guilds }) => {
        user.setPresence({
            status: "dnd",
            activities: [{ type: "PLAYING", name: "starting up..." }]
        });

        firstLaunch && await user.setAvatar("./assets/avatar.png");

        await botLogs.init(client);

        await registerCommands(client);
        await registerEvents(client);

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
 * Registers all the bots' slash commands  
 * What gets registered is defined by the `index.ts` in the `commands` folder
 */
async function registerCommands(client: Client)
{
    try
    {
        commands.forEach(CmdClass => cmds.push(new CmdClass()));

        const slashCmds = cmds.map(c => c.getSlashCmdJson());

        try
        {
            // use this when ready for production, as global commands are aggressively cached and take an hour to update across guilds, while guild commands update instantly
            // see https://discordjs.guide/interactions/slash-commands.html#global-commands
            // 
            // await rest.put(
            //     Routes.applicationCommands(env.CLIENT_ID ?? "ERR_NO_ENV"), {
            //         body: slashCmds
            //     },
            // );
            // 
            // console.log(`• Registered ${k.green(slashCmds.length)} global slash command${slashCmds.length != 1 ? "s" : ""}`);


            // guild commands
            // see https://discordjs.guide/interactions/slash-commands.html#guild-commands
            // TODO: needs to be run when a guild is joined
            const guilds = client.guilds.cache.map(g => g.id);

            for await(const guild of guilds)
            {
                // console.log(`Registering guild commands in ${client.guilds.cache.find(g => g.id === guild)?.name}`);

                await rest.put(
                    Routes.applicationGuildCommands(env.CLIENT_ID ?? "ERR_NO_ENV", guild), {
                        body: slashCmds
                    },
                );
            }

            console.log(`• Registered ${k.green(slashCmds.length)} slash command${slashCmds.length != 1 ? "s" : ""} in ${k.green(guilds.length)} guild${guilds.length != 1 ? "s" : ""}`);
        }
        catch(err)
        {
            console.error(k.red("Error while registering commands:\n") + (err instanceof Error) ? String(err) : "Unknown Error");
        }

        // listen for slash commands

        client.on("interactionCreate", async interaction => {
            if(!interaction.isCommand())
                return;

            const { commandName, options } = interaction;

            const opts = options.data && options.data.length > 0 ? options.data : undefined;

            const cmd = cmds.find(({ meta }) => meta.name === commandName);

            if(!cmd)
                return;

            await cmd.tryRun(interaction, Array.isArray(opts) ? opts[0] : opts);
        });
    }
    catch(err: unknown)
    {
        console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
    }
}

/**
 * Registers all the bots' events  
 * What gets registered is defined by the `index.ts` in the `events` folder
 */
async function registerEvents(client: Client)
{
    try
    {
        events.forEach(EvtClass => evts.push(new EvtClass()));

        // listen for events

        for(const ev of evts)
        {
            for(const evName of ev.names)
                client.on(evName, async (...args) => void await ev.run(...args));
        }

        console.log(`• Registered ${k.green(evts.length)} client event${evts.length != 1 ? "s" : ""}`);
    }
    catch(err: unknown)
    {
        console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
    }
}

init();
