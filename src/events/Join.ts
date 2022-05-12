import { GuildMember } from "discord.js";
import { Event } from "../Event";


export class Join extends Event
{
    constructor()
    {
        super("guildMemberAdd");
    }

    async run({ displayName }: GuildMember)
    {
        console.log("Member joined:", displayName);
    }
}
