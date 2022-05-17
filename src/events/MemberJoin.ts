import { GuildMember } from "discord.js";
import { Event } from "../Event";


export class MemberJoin extends Event
{
    constructor()
    {
        super("guildMemberAdd");
    }

    async run({ guild, displayName }: GuildMember)
    {
        console.log(`[${guild.name}] Member joined: ${displayName}`);
    }
}
