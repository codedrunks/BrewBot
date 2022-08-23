import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder, GuildMemberRoleManager } from "discord.js";
import { Command } from "@src/Command";
import { four_hours, getMusicManager, reduceSongsLength } from "@src/lavalink/client";
import { embedify } from "@utils/embedify";
import { getPremium, isDJOnlyandhasDJRole } from "@database/music";
import { SearchQuery, SearchResult } from "erela.js";
import { randRange } from "svcorelib";

const activeSearches: Set<string> = new Set();

export class Search extends Command {
    constructor() {
        super({
            name: "search",
            desc: "Search for a song",
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
                    desc: "Places song into the queue randomly"
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {

        await this.deferReply(int);

        const args = this.resolveArgs(int);

        const guild = int.guild;

        if(activeSearches.has(int.user.id)) return this.editReply(int, embedify("Cancel or select from previous search before searching again"));

        if(!guild || !int.channel) return this.editReply(int, embedify("This command cannot be used in DM's"));

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.editReply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.editReply(int, embedify("You must be in a voice channel to use this command"));

        const manager = getMusicManager();

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

        if(res.loadType == "LOAD_FAILED") return this.editReply(int, embedify("Something went wrong loading that track"));

        if(res.loadType == "NO_MATCHES") return this.editReply(int, embedify("No songs were found with that title"));

        const player = manager.get(guild.id) ?? manager.create({
            guild: guild.id,
            voiceChannel: voice,
            textChannel: int.channel.id,
            selfDeafen: true
        });

        // there was no pretty way of doing this tbh but illusion is a fucking whore so, so be it ig
        if(( res.loadType == "PLAYLIST_LOADED" ? reduceSongsLength(res.tracks) : res.tracks[0].duration ) + (player.queue.totalSize ?? 0) > four_hours 
            && !(await getPremium(guild.id)))
            return this.editReply(int, embedify("Total queue time will be over 4 hours, please purchase premium to add more songs to your queue"));

        if(res.loadType == "SEARCH_RESULT") {

            if(res.tracks.length > 10) res.tracks.length = 10;

            const embed = embedify(`${res.tracks.map((v, i) => `${i + 1}: \`${v.title}\``).join("\n")}\n\n\`Type a number to make your selection or type cancel to cancel\``).setTitle("**Search Results**");

            this.editReply(int, embed);

            const collector = int.channel.createMessageCollector({ filter: (m) => {
                return m.author.id == int.user.id;
            }, time: 20_000});

            const idxs = [...res.tracks.map((_, i) => i + 1)];

            activeSearches.add(int.user.id);

            collector.on("collect", async m => {

                if(m.content == "cancel") {
                    await m.delete();

                    collector.stop();

                    if(activeSearches.has(int.user.id)) activeSearches.delete(int.user.id);
                    
                    return this.editReply(int, embedify("Canceled search"));
                }

                if(idxs.includes(parseInt(m.content))) {
                    const position = args.position || null;
                    const index = Number(m.content) - 1;

                    const track = res.tracks[index];

                    if(player.state !== "CONNECTED") player.connect();
                    const channelMention = `<#${voice}>`;

                    let sEmbed: EmbedBuilder | undefined;

                    if(position == "next") {
                        player.queue.add(track, 0);
                        sEmbed = embedify(`Queued \`${track.title}\` to play next in ${channelMention}`);
                    }

                    else if(position == "now") {
                        player.queue.add(track, 0);
                        sEmbed = embedify(`Skipped ${player.queue.current ? `\`${player.queue.current.title}\`` : "nothing"} and queueing \`${track.title}\` in ${channelMention}`);

                        setTimeout(() => {
                            if(player.queue.totalSize > 1) player.stop();
                        }, 200);
                    }

                    else {
                        player.queue.add(track, args.shuffled ? randRange(0, player.queue.size) : undefined);
                        sEmbed = embedify(`Queued \`${track.title}\` in ${channelMention}`);
                    }

                    sEmbed = sEmbed ?? embedify("Something went wrong");

                    this.editReply(int, sEmbed);

                    if(!player.playing && !player.paused && !player.queue.size) player.play();

                    await m.delete();
                    
                    if(activeSearches.has(int.user.id)) activeSearches.delete(int.user.id);

                    collector.stop();
                }
            });

            collector.on("end", c => {
                if(c.size == 0) this.editReply(int, embedify("No selection was made"));

                if(activeSearches.has(int.user.id)) activeSearches.delete(int.user.id);

                if(player && !player.queue.current) player.destroy();
            });
            // TODO: implement playlists here too :sadge:
        } else if(res.loadType == "PLAYLIST_LOADED" || res.loadType == "TRACK_LOADED") {
            return this.editReply(int, embedify("Playlist and URL search support coming soon."));


        } else return this.editReply(int, embedify("Something went wrong"));
    }
}
