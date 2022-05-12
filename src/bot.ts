import { Client } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";
import k from "kleur";
import { Command } from "./Command";
import { commands } from "./commands";
import { events } from "./events";
import { Event } from "./Event";
import { allOfType } from "svcorelib";

const { env } = process;

dotenv.config();

const rest = new REST({
    version: "9"
}).setToken(env.BOT_TOKEN ?? "ERR_NO_ENV");


/** After `registerCommands()` finishes, this contains all command class instances */
const cmds: Command[] = [];
/** After `registerEvents()` finishes, this contains all event class instances */
const evts: Event[] = [];


function init()
{
    console.log("Initializing...\n");

    if(!allOfType([ env.BOT_TOKEN, env.CLIENT_ID ], "string"))
        throw new Error("Missing environment variable(s). Please correct them according to the .env.template");

    const client = new Client({
        intents: [ "GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "GUILD_PRESENCES" ],
    });

    client.login(env.BOT_TOKEN);

    client.on("ready", async ({ user, guilds }) => {
        user.setPresence({
            status: "dnd",
            activities: [{ type: "PLAYING", name: "starting up..." }]
        });

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

        const slashCmds = cmds.map((cur) => cur.getSlashCmdJson());

        await rest.put(
            Routes.applicationCommands(env.CLIENT_ID ?? "ERR_NO_ENV"), {
                body: slashCmds
            },
        );

        console.log(`• Registered ${k.green(slashCmds.length)} global slash command${slashCmds.length != 1 ? "s" : ""}`);

        // listen for slash commands

        client.on("interactionCreate", async interaction => {
            if(!interaction.isCommand())
                return;

            const { commandName } = interaction;

            const cmd = cmds.find(({ meta }) => meta.name === commandName);

            if(!cmd)
                return;

            await cmd.tryRun(interaction);
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
