import { GuildMember, PartialGuildMember } from "discord.js";
import { sendLogMsg } from "../botLogs";
import { Event } from "../Event";


export class MemberLeave extends Event
{
    constructor()
    {
        super("guildMemberRemove");
    }

    async run({ guild, displayName }: GuildMember | PartialGuildMember)
    {
        console.log(`[${guild.name}] User left: ${displayName}`);

        sendLogMsg(`🛑 Member ${displayName} left`);
    }
}
