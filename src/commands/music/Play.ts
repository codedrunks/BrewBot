import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

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
        const args = this.resolveArgs(int);

        const guild = int.guild;

        if(!guild || !int.channel) return this.reply(int, embedify("This command cannot be used in DM's"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"), true);

        const manager = getManager();

        const res = await manager.search({
            query: args.song,
            source: "youtube"
        }, int.user);

        if(res.loadType == "LOAD_FAILED") return this.reply(int, embedify("Something went wrong loading that track"), true);

        if(res.loadType == "NO_MATCHES") return this.reply(int, embedify("No songs were found with that title"), true);

        const player = manager.create({
            guild: guild.id,
            voiceChannel: voice,
            textChannel: int.channel.id
        });

        player.connect();

        const channelMention = `<#${voice}>`;

        if(res.loadType == "TRACK_LOADED" || res.loadType == "SEARCH_RESULT") {
            player.queue.add(res.tracks[0]);

            if(!player.playing && !player.paused && !player.queue.size) player.play();

            return this.reply(int, embedify(`Queued ${res.tracks[0].title} in ${channelMention}`));
        } else if(res.loadType == "PLAYLIST_LOADED") {
            player.queue.add(res.tracks);

            if(!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) player.play();

            return this.reply(int, embedify(`Queued playlist \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
        }
    }
}
