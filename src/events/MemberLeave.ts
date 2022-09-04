import { GuildMember, PartialGuildMember } from "discord.js";
import { sendLogMsg } from "@src/botLogs";
import { Event } from "@src/Event";


export class MemberLeave extends Event
{
    constructor()
    {
        super("guildMemberRemove");

        this.enabled = false;
    }

    async run({ displayName, guild }: GuildMember | PartialGuildMember)
    {
        sendLogMsg(guild.id, `🛑 Member ${displayName} left`);
    }
}
