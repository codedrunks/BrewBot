import { Client, Collection, GuildMember } from "discord.js";
import { Player, Track, TrackEndEvent } from "erela.js";
import { skipVotes } from "@src/commands/music/global.skips";

export function trackEnd(player: Player, track: Track, payload: TrackEndEvent, client: Client) {
    if(!player.voiceChannel) return;

    const voiceChannel = client.guilds.cache.get(player.guild)?.channels.cache.get(player.voiceChannel as string)?.members;

    if(skipVotes[player.voiceChannel]) delete skipVotes[player.voiceChannel];

    // thinking about wrapping this in a timeout for convenience
    if((voiceChannel as Collection<string, GuildMember>).size <= 1 && player.queue.totalSize > 1) {
        player.destroy();
    }

    setTimeout(() => {
        player.play();
    }, 200);
}
