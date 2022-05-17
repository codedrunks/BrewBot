import { Client } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";

dotenv.config();

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
    const commands = await rest.get(Routes.applicationCommands(clientId)) as { id: string }[];

    for await(const command of commands)
    {
        await rest.delete(`${Routes.applicationCommands(clientId)}/${command.id}`);
    }


    // guild cmds
    const guilds = [ "693878197107949572" ];

    for await(const guild of guilds)
    {
        const commands = await rest.get(Routes.applicationGuildCommands(clientId, guild)) as { id: string }[];

        for await(const command of commands)
        {
            await rest.delete(`${Routes.applicationGuildCommands(clientId, guild)}/${command.id}`);
        }
    }

    console.log("Deleted all slash commands. Global commands may take an hour or so to update.");
    process.exit();
});
