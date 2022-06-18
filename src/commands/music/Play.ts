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


        const manager = getManager();

        const args = this.resolveArgs(int);

        const guild = int.guild;

        if(!guild || !int.channel) return this.reply(int, embedify("This command cannot be used in DM's"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"));

        const res = await manager.search({
            query: args.song,
            source: "youtube"
        }, int.user);

        if(res.loadType == "LOAD_FAILED") return this.reply(int, embedify("Something went wrong loading that track"));

        if(res.loadType == "NO_MATCHES") return this.reply(int, embedify("No songs were found with that title"));

        const player = manager.create({
            guild: guild.id,
            voiceChannel: voice,
            textChannel: int.channel.id
        });

        player.connect();

        if(res.loadType == "TRACK_LOADED" || res.loadType == "SEARCH_RESULT") {
            player.queue.add(res.tracks[0]);

            if(!player.playing && !player.paused && !player.queue.size) player.play();

            return this.reply(int, embedify(`Queued ${res.tracks[0].title}`));
        } else if(res.loadType == "PLAYLIST_LOADED") {
            player.queue.add(res.tracks);


        }

        // const manager = getManager();

        // const args = this.resolveArgs(int);

        // if(!int.guild || !int.channel?.id) return this.reply(int, "This command cannot be used in DM's");

        // const guild = int.guild;

        // console.log(guild.members.cache.get(int.user.id)?.voice.channel?.id);

        // const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        // if(!voice) return this.reply(int, "You must be in a voice channel to use this command!");

        // const res = await manager.search({
        //     query: args.song,
        //     source: "youtube"
        // }, int.user);

        // const player = manager.create({
        //     guild: guild.id,
        //     voiceChannel: voice,
        //     textChannel: int.channel.id
        // });

        // player.connect();

        // player.queue.add(res.tracks[0]);
        // this.reply(int, `Track ${res.tracks[0].title} being queued`);

        // if(!res.playlist)
        //     if(!player.playing && !player.paused && !player.queue.size)
        //         return player.play();
        

        // if (!player.playing && !player.paused && player.queue.totalSize === res.tracks.length)
        //     player.play();
    }
}

/** user uses /play "search string or url", will have options to use youtube, soundcloud, and spotify 
 * 
 * first get manager instance, and do type guards
 * 
 * then search with the users input
 * 
 * determine if the input was a playlist
 * 
 * if playlist
 *    add songs to queue
 *    play first song
 * if not
 *    play first song
*/
