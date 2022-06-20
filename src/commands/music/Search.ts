import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

export class Search extends Command {
    constructor() {
        super({
            name: "search",
            desc: "Search for a song",
            args: [
                {
                    name: "song",
                    type: "string",
                    desc: "Song to play or URL",
                    required: true
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {

        await this.deferReply(int);

        const args = this.resolveArgs(int);

        const guild = int.guild;

        if(!guild || !int.channel) return this.editReply(int, embedify("This command cannot be used in DM's"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.editReply(int, embedify("You must be in a voice channel to use this command"));

        const manager = getManager();
        const res = await manager.search({
            query: args.song,
            source: "youtube"
        }, int.user);

        if(res.loadType == "LOAD_FAILED") return this.editReply(int, embedify("Something went wrong loading that track"));

        if(res.loadType == "NO_MATCHES") return this.editReply(int, embedify("No songs were found with that title"));

        if(res.loadType == "SEARCH_RESULT") {

            const player = manager.get(guild.id) ?? manager.create({
                guild: guild.id,
                voiceChannel: voice,
                textChannel: int.channel.id
            });

            if(res.tracks.length > 10) res.tracks.length = 10;

            const embed = embedify(`${res.tracks.map((v, i) => `${i + 1}: \`${v.title}\``).join("\n")}\n\n\`Type a number to make your selection\``).setTitle("**Search Results**");

            this.editReply(int, embed);

            const collector = int.channel.createMessageCollector({ filter: (m) => {
                return m.author.id == int.user.id;
            }, time: 15_000});

            const idxs = [...res.tracks.map((_, i) => i + 1)];

            collector.on("collect", m => {
                if(idxs.includes(parseInt(m.content))) {
                    const index = Number(m.content) - 1;

                    const track = res.tracks[index];

                    if(player.state !== "CONNECTED") player.connect();
                    const channelMention = `<#${voice}>`;

                    player.queue.add(track);

                    if(!player.playing && !player.paused && !player.queue.size) player.play();

                    this.editReply(int, embedify(`Queued \`${track.title}\` in ${channelMention}`));

                    collector.stop();
                }
            });

            collector.on("end", c => {
                if(c.size == 0) this.editReply(int, embedify("No selection was made"));

                if(player && !player.queue.current) player.destroy();
            });
        }

    }
}
