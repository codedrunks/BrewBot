import { ApplicationCommandOptionType, CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { SearchQuery, SearchResult } from "erela.js";
import { Command } from "@src/Command";
import { four_hours, getMusicManager, reduceSongsLength } from "@src/lavalink/client";
import { embedify } from "@utils/embedify";
import { getPremium, isDJOnlyandhasDJRole } from "@database/music";
import { randomizeArray, randRange } from "svcorelib";

export class Play extends Command {
    constructor() {
        super({
            name: "play",
            desc: "Plays a song from youtube url",
            category: "music",
            args: [
                {
                    name: "song",
                    type: ApplicationCommandOptionType.String,
                    desc: "Song to play or URL",
                    required: true
                },
                {
                    name: "source",
                    type: ApplicationCommandOptionType.String,
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
                    type: ApplicationCommandOptionType.String,
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
                    type: ApplicationCommandOptionType.Boolean,
                    desc: "Shuffles a playlist before adding, places into the queue randomly if a single track"
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

        if(djcheck) return this.editReply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.editReply(int, embedify("You must be in a voice channel to use this command"));

        const manager = getMusicManager();

        const player = manager.get(guild.id) ?? manager.create({
            guild: guild.id,
            voiceChannel: voice,
            textChannel: int.channel.id,
            selfDeafen: true
        });

        let res: SearchResult;

        if((/^(?:spotify:|https:\/\/[a-z]+\.spotify\.com\/(track\/|user\/(.*)\/playlist\/))(.*)$/.test(args.song)
            || args.source == "spotify")) {
            res = await manager.search(args.song, int.user);
        } else {
            res = await manager.search({
                query: args.song,
                source: args.source as SearchQuery["source"] ?? "youtube"
            }, int.user);
        }

        if(voice !== player.voiceChannel) return this.editReply(int, embedify("You must be in the same voice channel as the bot"));

        if(res.loadType == "LOAD_FAILED") return this.editReply(int, embedify("That URL type is not supported or something went wrong"));
        
        if(res.loadType == "NO_MATCHES") return this.editReply(int, embedify("No songs were found with that title"));

        // there was no pretty way of doing this tbh but illusion is a fucking whore so, so be it ig
        if(( res.loadType == "PLAYLIST_LOADED" ? reduceSongsLength(res.tracks) : res.tracks[0].duration ) + (player.queue.totalSize ?? 0) > four_hours 
            && !(await getPremium(guild.id)))
            return this.editReply(int, embedify("Total queue time will be over 4 hours, please purchase premium to add more songs to your queue"));

        if(player.state !== "CONNECTED") player.connect();

        const channelMention = `<#${voice}>`;

        const position = args.position || null;

        if(res.loadType == "TRACK_LOADED" || res.loadType == "SEARCH_RESULT" || res.loadType == "PLAYLIST_LOADED" && res.tracks.length == 1) {
            if(position == "now") {
                this.editReply(int, embedify(`Skipped ${player.queue.current ? `\`${player.queue.current.title}\`` : "nothing"} and queueing \`${res.tracks[0].title}\` in ${channelMention}`));
                player.queue.add(res.tracks[0], 0);
                
                setTimeout(() => { if(player.queue.totalSize > 1) player.stop(); }, 200); //find golden timing

                return;
            } else if(position == "next") {
                player.queue.add(res.tracks[0], 0);

                return this.editReply(int, embedify(`Queued \`${res.tracks[0].title}\` to play next in ${channelMention}`));
            }

            player.queue.add(res.tracks[0], args.shuffled ? randRange(0, player.queue.size) : undefined);

            if(!player.playing && !player.paused && !player.queue.size) player.play();

            return this.editReply(int, embedify(`Queued \`${res.tracks[0].title}\` in ${channelMention}`));
        } else if(res.loadType == "PLAYLIST_LOADED") {

            const tracks = args.shuffled ? randomizeArray(res.tracks) : res.tracks;

            if(position == "now") {
                this.editReply(int, embedify(`Skipped ${player.queue.current ? `\`${player.queue.current.title}\`` : "nothing"} and queueing \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
                player.queue.add(tracks, 0);

                player.stop();

                return;
            } else if(position == "next") {
                player.queue.add(tracks, 0);

                return this.editReply(int, embedify(`Queued \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
            }

            player.queue.add(tracks);

            if(!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) player.play();

            return this.editReply(int, embedify(`Queued playlist \`${res.playlist?.name}\` with ${res.tracks.length} tracks in ${channelMention}`));
        }
    }
}
