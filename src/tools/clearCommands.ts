import { Client, GatewayIntentBits } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import dotenv from "dotenv";
import k from "kleur";
import { exists, unlink } from "fs-extra";
import { settings } from "../settings";
import { ringBell } from "@src/utils";

/** Amount of commands to delete per batch */
const batchSize = 2;
/** Timeout between deleting batches of commands */
const deleteTimeout = 8000;

dotenv.config();
const Intents = GatewayIntentBits;

const clientId = process.env.CLIENT_ID ?? "ERR_NO_ENV";

const rest = new REST({
    version: "10",
}).setToken(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

const cl = new Client({
    intents: [ Intents.Guilds, Intents.GuildMessages, Intents.GuildMembers, Intents.GuildPresences ],
});

console.log("Logging in...");

cl.login(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

cl.once("ready", async (client) => {
    await client.user?.setPresence({ status: "dnd" });

    console.log(k.yellow("\nClearing all global and guild commands."), "\nThis might take a while because of rate limiting.\n");

    if(await exists(settings.commands.hashFilePath)) {
        await unlink(settings.commands.hashFilePath);
        console.log(`• Deleted command hash at '${settings.commands.hashFilePath}'`);
    }

    // global cmds
    console.log("\n• Clearing global commands...");

    const commands = await rest.get(Routes.applicationCommands(clientId)) as { id: string }[];

    if(commands.length === 0)
        console.log(k.gray("(no global commands)"));

    const globalCmds = [];
    for(const command of commands)
        globalCmds.push(rest.delete(`${Routes.applicationCommands(clientId)}/${command.id}`));

    await Promise.all(globalCmds);


    // guild cmds
    console.log("\n• Clearing guild commands...");

    const guilds = client.guilds.cache.map(g => g.id);

    for(const guild of guilds) {
        process.stdout.write(k.gray(("│ ") + (client.guilds.cache.find(g => g.id === guild)?.name ?? `<guild #${guild}>`)));

        const commands = await rest.get(Routes.applicationGuildCommands(clientId, guild)) as { id: string }[];

        if(commands.length === 0) {
            console.log(k.gray("(no commands)"));
            continue;
        }
        process.stdout.write(k.gray(` (${commands.length}): `));

        const cmds = [...commands];
        const delCmds: (() => Promise<void>)[] = [];

        while(cmds.length > 0) {
            const cmdsSlice = cmds.splice(0, batchSize);
            delCmds.push(() => new Promise(async (res) => {
                for(const cmd of cmdsSlice) {
                    await rest.delete(`${Routes.applicationGuildCommands(clientId, guild)}/${cmd.id}`);
                    process.stdout.write(k.gray("*"));
                }
                setTimeout(res, deleteTimeout);
            }));
        }

        for(const delCmd of delCmds)
            await delCmd();
        process.stdout.write("\n");
    }

    console.log(k.yellow("\n\nDeleted all slash commands.") + "\nGuild commands take up to a few minutes, while global commands take about an hour or so to get updated across Discord servers.\n");
    ringBell();

    process.exit(0);
});
