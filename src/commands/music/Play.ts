import { CommandInteraction } from "discord.js";
import { SearchQuery } from "erela.js";
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
                    desc: "Song to play or URL",
                    required: true
                },
                {
                    name: "source",
                    type: "string",
                    desc: "Source for the music to be searched from"
                },
                {
                    name: "position",
                    type: "string",
                    desc: "Whether to play the song now or next, if so desired",
                    choices: [
                        {
                            name: "now",
                            value: "now"
                        },
                        {
                            name: "next",
                            value: "next"
                        }
                    ]
                }
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const args = this.resolveArgs(int);

        await this.deferReply(int);

        const sources = ["youtube", "soundcloud"];

        if(args.source && !sources.includes(args.source)) return this.editReply(int, embedify("Sources must be either `youtube` (includes youtube music) or `soundcloud`.\n\n`spotify support coming soon`"));

        const guild = int.guild;

        if(!guild || !int.channel) return this.editReply(int, embedify("This command cannot be used in DM's"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.editReply(int, embedify("You must be in a voice channel to use this command"));

        const manager = getManager();

        const res = await manager.search({
            query: args.song,
            source: args.source as SearchQuery["source"] ?? "youtube"
        }, int.user);

        if(res.loadType == "LOAD_FAILED") return this.editReply(int, embedify("Something went wrong loading that track"));

        if(res.loadType == "NO_MATCHES") return this.editReply(int, embedify("No songs were found with that title"));

        const player = manager.get(guild.id) ?? manager.create({
            guild: guild.id,
            voiceChannel: voice,
            textChannel: int.channel.id
        });

        if(player.state !== "CONNECTED") player.connect();

        const channelMention = `<#${voice}>`;

        // const [now, next] = [Boolean(args.now) ?? false, Boolean(args.next) ?? false];
        const position = args.position || null;

        if(res.loadType == "TRACK_LOADED" || res.loadType == "SEARCH_RESULT") {
            if(position == "now") {
                this.editReply(int, embedify(`Skipped ${player.queue.current ? `\`${player.queue.current.title}\`` : "nothing"} and queueing \`${res.tracks[0].title}\` in ${channelMention}`));
                player.queue.add(res.tracks[0], 0);
                
                setTimeout(() => {player.stop();}, 200); //find golden timing

                return;
            } else if(position == "next") {
                player.queue.add(res.tracks[0], 0);

                return this.editReply(int, embedify(`Queued \`${res.tracks[0].title}\` to play next in ${channelMention}`));
            }

            player.queue.add(res.tracks[0]);

            if(!player.playing && !player.paused && !player.queue.size) player.play();

            return this.editReply(int, embedify(`Queued \`${res.tracks[0].title}\` in ${channelMention}`));
        } else if(res.loadType == "PLAYLIST_LOADED") {
            if(position == "now") {
                this.editReply(int, embedify(`Skipped ${player.queue.current ? `\`${player.queue.current.title}\`` : "nothing"} and queueing \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
                player.queue.add(res.tracks, 0);

                player.stop();

                return;
            } else if(position == "next") {
                player.queue.add(res.tracks, 0);

                return this.editReply(int, embedify(`Queued \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
            }

            player.queue.add(res.tracks);

            if(!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) player.play();

            return this.editReply(int, embedify(`Queued playlist \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
        }
    }
}
