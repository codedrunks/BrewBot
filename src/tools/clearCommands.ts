import { Client } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";
import k from "kleur";

dotenv.config();

console.log("Logging in...");

const clientId = process.env.CLIENT_ID ?? "ERR_NO_ENV";

const rest = new REST({
    version: "9"
}).setToken(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

const cl = new Client({
    intents: [ "GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "GUILD_PRESENCES" ],
});

cl.login(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

cl.once("ready", async (client) => {
    await client.user?.setPresence({ status: "dnd" });

    console.log(k.yellow("\nClearing all global and guild commands."), "\nThis might take a while since the 5 requests/s rule applies and I was too lazy to time them better.\n");

    // global cmds
    console.log("• Clearing global commands...");

    const commands = await rest.get(Routes.applicationCommands(clientId)) as { id: string }[];

    const globalCmds = [];
    for(const command of commands)
        globalCmds.push(rest.delete(`${Routes.applicationCommands(clientId)}/${command.id}`));

    await Promise.all(globalCmds);


    // guild cmds
    console.log("\n• Clearing guild commands...");

    const guilds = client.guilds.cache.map(g => g.id);

    for await(const guild of guilds)
    {
        process.stdout.write(k.gray(("│ ") + (client.guilds.cache.find(g => g.id === guild)?.name ?? `<guild #${guild.substring(0, 12)}…>`) + ": "));

        const commands = await rest.get(Routes.applicationGuildCommands(clientId, guild)) as { id: string }[];

        const guildCmds: Promise<void>[] = [];

        for(const command of commands)
            guildCmds.push(new Promise(async (res) => {
                await rest.delete(`${Routes.applicationGuildCommands(clientId, guild)}/${command.id}`);
                process.stdout.write(k.gray("*"));
                res();
            }));

        await Promise.all(guildCmds);
        process.stdout.write("\n");
    }

    console.log(k.yellow("\n\nDeleted all slash commands.") + "\nGuild commands take up to a few minutes, while global commands take about an hour or so to get updated across Discord servers.\n");
    process.exit(0);
});
