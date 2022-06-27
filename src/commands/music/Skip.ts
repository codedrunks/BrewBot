import { CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";
import { isDJOnlyandhasDJRole } from "../../database/music";

export class Skip extends Command {
    constructor() {
        super({
            name: "skip",
            desc: "Skip the currently playing song",
            category: "music",
            args: [
                {
                    name: "amount",
                    desc: "amount of songs to skip, including current song"
                },
                {
                    name: "to",
                    desc: "song to skip to in queue"
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const args = this.resolveArgs(int);

        const amount = args.amount ? Number(args.amount) : 1;

        const to = args.to ? Number(args.to) : 0;

        const total = amount + to;

        const guild = int.guild;
        
        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.reply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));
        
        const manager = getManager();

        const player = manager.get(guild.id);

        if(!player || !player.paused && !player.playing) return this.reply(int, embedify("There is no music playing in this server"), true);

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"), true);

        if(voice !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel with the bot"), true);

        const title = player.queue.current?.title;

        player.stop(args.to ? total - 1 : total);
        return this.reply(int, embedify(total == 1 ? `\`${title}\` was skipped` : `${args.to ? total - 1 : total} tracks were skipped`));
    }
}
