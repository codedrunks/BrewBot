import { GuildMember } from "discord.js";
import { Event } from "../Event";
import { sendLogMsg } from "../botLogs";

export class MemberJoin extends Event
{
    constructor()
    {
        super("guildMemberAdd");

        this.enabled = false;
    }

    async run({ displayName }: GuildMember)
    {
        sendLogMsg(`▶️ Member ${displayName} joined`);
    }
}
