import { CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";
import { isDJOnlyandhasDJRole } from "../../database/music";

export class Shuffle extends Command {
    constructor() {
        super({
            name: "shuffle",
            desc: "Shuffles the queue",
            category: "music"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.reply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        const manager = getManager();
        const player = manager.get(guild.id);

        if(!player || !player.queue.current) return this.reply(int, embedify("There is no music playing in this server"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You are not in the voice channel"));

        player.queue.shuffle();

        return this.reply(int, embedify("Shuffled the queue"));
    }
}
