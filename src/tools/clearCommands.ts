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

const client = new Client({
    intents: [ "GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "GUILD_PRESENCES" ],
});

client.login(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

client.on("ready", async () => {
    // global cmds
    console.log("Clearing global commands...");

    const commands = await rest.get(Routes.applicationCommands(clientId)) as { id: string }[];

    const globalCmds = [];
    for(const command of commands)
        globalCmds.push(rest.delete(`${Routes.applicationCommands(clientId)}/${command.id}`));

    await Promise.all(globalCmds);


    // guild cmds
    console.log("Clearing guild commands...");

    const guilds = client.guilds.cache.map(g => g.id);

    for await(const guild of guilds)
    {
        const commands = await rest.get(Routes.applicationGuildCommands(clientId, guild)) as { id: string }[];

        const guildCmds = [];
        for(const command of commands)
            guildCmds.push(rest.delete(`${Routes.applicationGuildCommands(clientId, guild)}/${command.id}`));

        await Promise.all(guildCmds);
    }

    console.log(k.yellow("\nDeleted all slash commands.") + "\nGuild commands take up to a few minutes, while global commands take about an hour or so to get updated across Discord servers.\n");
    process.exit(0);
});
