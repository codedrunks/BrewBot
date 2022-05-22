import { Guild } from "discord.js";
import { registerGuildCommands } from "../registry";
import { Event } from "../Event";


export class GuildJoined extends Event
{
    constructor()
    {
        super("guildCreate");
    }

    async run(guild: Guild)
    {
        //TODO: register all commands for this guild

        await registerGuildCommands(guild.id);

        console.log(`I just joined the guild "${guild.name}" and registered all slash commands there`);
    }
}
