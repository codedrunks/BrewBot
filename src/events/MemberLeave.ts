import { GuildMember, PartialGuildMember } from "discord.js";
import { sendLogMsg } from "../botLogs";
import { Event } from "../Event";


export class MemberLeave extends Event
{
    constructor()
    {
        super("guildMemberRemove");

        this.enabled = false;
    }

    async run({ displayName }: GuildMember | PartialGuildMember)
    {
        sendLogMsg(`🛑 Member ${displayName} left`);
    }
}
