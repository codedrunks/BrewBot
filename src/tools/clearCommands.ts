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
    console.log("Clearing commands...");

    // global cmds
    const commands = await rest.get(Routes.applicationCommands(clientId)) as { id: string }[];

    for await(const command of commands)
    {
        await rest.delete(`${Routes.applicationCommands(clientId)}/${command.id}`);
    }


    // guild cmds
    const guilds = client.guilds.cache.map(g => g.id);

    for await(const guild of guilds)
    {
        const commands = await rest.get(Routes.applicationGuildCommands(clientId, guild)) as { id: string }[];

        for await(const command of commands)
        {
            await rest.delete(`${Routes.applicationGuildCommands(clientId, guild)}/${command.id}`);
        }
    }

    console.log(k.yellow("\nDeleted all slash commands."), "Global commands take an hour or so to get updated across Discord servers.\n");
    process.exit();
});
