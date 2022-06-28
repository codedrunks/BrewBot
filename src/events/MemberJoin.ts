import { GuildMember } from "discord.js";
import { Event } from "@src/Event";
import { sendLogMsg } from "@src/botLogs";

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
