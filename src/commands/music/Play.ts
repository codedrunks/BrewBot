import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";

export class Play extends Command {
    constructor() {
        super({
            name: "play",
            desc: "Plays a song from youtube url",
            args: [
                {
                    name: "song",
                    type: "string",
                    desc: "Youtube link",
                    required: true
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {

        const manager = getManager();

        const args = this.resolveArgs(int);

        if(!int.guild || !int.channel?.id) return this.reply(int, "This command cannot be used in DM's");

        const guild = int.guild;

        console.log(guild.members.cache.get(int.user.id)?.voice.channel?.id);

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, "You must be in a voice channel to use this command!");

        const res = await manager.search({
            query: args.song,
            source: "youtube"
        }, int.user);

        const player = manager.create({
            guild: guild.id,
            voiceChannel: voice,
            textChannel: int.channel.id
        });

        player.connect();

        player.queue.add(res.tracks[0]);
        this.reply(int, `Track ${res.tracks[0].title} being queued`);

        if(!player.playing && !player.paused && !player.queue.size)
            player.play();

        // if (!player.playing && !player.paused && player.queue.totalSize === res.tracks.length)
        //     player.play();
    }
}
