import { CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { SearchQuery, SearchResult } from "erela.js";
import { Command } from "@src/Command";
import { getManager } from "@src/lavalink/client";
import { embedify } from "@src/util";
import { isDJOnlyandhasDJRole } from "@database/music";

export class Play extends Command {
    constructor() {
        super({
            name: "play",
            desc: "Plays a song from youtube url",
            category: "music",
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
                    desc: "Source for the music to be searched from",
                    choices: [
                        {
                            name: "youtube/youtube music",
                            value: "youtube"
                        },
                        {
                            name: "soundcloud",
                            value: "soundcloud"
                        },
                        {
                            name: "spotify",
                            value: "spotify"
                        }
                    ]
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
                },
                {
                    name: "shuffled",
                    type: "boolean",
                    desc: "Whether or not to shuffle the songs in a playlist before playing/queueing"
                }
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void> {

        await this.deferReply(int);
        
        const args = this.resolveArgs(int);

        const guild = int.guild;

        if(!guild || !int.channel) return this.editReply(int, embedify("This command cannot be used in DM's"));

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.reply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.editReply(int, embedify("You must be in a voice channel to use this command"));

        const manager = getManager();

        let res: SearchResult;

        if((/^(?:spotify:|https:\/\/[a-z]+\.spotify\.com\/(track\/|user\/(.*)\/playlist\/))(.*)$/.test(args.song)
            || args.source == "spotify")
            && process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
            res = await manager.search(args.song, int.user);
        } else {
            res = await manager.search({
                query: args.song,
                source: args.source as SearchQuery["source"] ?? "youtube"
            }, int.user);
        }

        if(res.loadType == "LOAD_FAILED") return this.editReply(int, embedify("That URL type is not supported or something went wrong"));
        
        if(res.loadType == "NO_MATCHES") return this.editReply(int, embedify("No songs were found with that title"));

        const player = manager.get(guild.id) ?? manager.create({
            guild: guild.id,
            voiceChannel: voice,
            textChannel: int.channel.id,
            selfDeafen: true
        });

        if(player.state !== "CONNECTED") player.connect();

        const channelMention = `<#${voice}>`;

        const position = args.position || null;

        if(res.loadType == "TRACK_LOADED" || res.loadType == "SEARCH_RESULT") {
            if(position == "now") {
                this.editReply(int, embedify(`Skipped ${player.queue.current ? `\`${player.queue.current.title}\`` : "nothing"} and queueing \`${res.tracks[0].title}\` in ${channelMention}`));
                player.queue.add(res.tracks[0], 0);
                
                setTimeout(() => { if(player.queue.totalSize > 1) player.stop(); }, 200); //find golden timing

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

                if(args.shuffled) player.queue.shuffle();

                player.stop();

                return;
            } else if(position == "next") {
                player.queue.add(res.tracks, 0);
                
                if(args.shuffled) player.queue.shuffle();

                return this.editReply(int, embedify(`Queued \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
            }

            player.queue.add(res.tracks);

            if(args.shuffled) player.queue.shuffle();

            if(!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) player.play();

            return this.editReply(int, embedify(`Queued playlist \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
        }
    }
}
