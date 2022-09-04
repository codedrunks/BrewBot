import { Guild } from "discord.js";
import { registerGuildCommands } from "@src/registry";
import { Event } from "@src/Event";


export class GuildJoined extends Event
{
    constructor()
    {
        super("guildCreate");
    }

    async run(guild: Guild)
    {
        await registerGuildCommands(guild.id);

        // TODO: add logger lib here
    }
}
