import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

export class Repeat extends Command {
    constructor() {
        super({
            name: "repeat",
            desc: "Repeats current song or queue",
            subcommands: [
                {
                    name: "song",
                    desc: "Sets current song to repeat"
                },
                {
                    name: "queue",
                    desc: "Sets current queue to repeat"
                }
            ]
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void> {
        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const manager = getManager();
        const player = manager.get(guild.id);

        if(!player || !player.paused && !player.playing || !player.queue.current) return this.reply(int, embedify("There is no music playing in this server"), true);

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"), true);

        if(voice !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel with the bot"), true);

        if(opt.name == "queue") {
            if(player.trackRepeat) player.setTrackRepeat(!player.trackRepeat);

            player.setQueueRepeat(!player.queueRepeat);

            return this.reply(int, embedify(`Queue is ${player.queueRepeat ? "repeating": "no longer repeating"}`));
        }

        if(player.queueRepeat) player.setQueueRepeat(!player.queueRepeat);

        player.setTrackRepeat(!player.trackRepeat);

        return this.reply(int, embedify(`\`${player.queue.current.title}\` is ${player.trackRepeat ? "repeating" : "no longer repeating"}`));
    }
}
