import { Guild } from "discord.js";
import { registerGuildCommands } from "../registry";
import { Event } from "../Event";
import { sendLogMsg } from "../botLogs";


export class GuildJoined extends Event
{
    constructor()
    {
        super("guildCreate");
    }

    async run(guild: Guild)
    {
        await registerGuildCommands(guild.id);

        await sendLogMsg(`I just joined the guild "${guild.name}" and registered all slash commands there`);
    }
}
