import { Client, Collection, GuildMember } from "discord.js";
import { Player, Track, TrackEndEvent } from "erela.js";

export function trackEnd(player: Player, track: Track, payload: TrackEndEvent, client: Client) {
    if(!player.voiceChannel) return;

    const voiceChannel = client.guilds.cache.get(player.guild)?.channels.cache.get(player.voiceChannel as string)?.members;

    // thinking about wrapping this in a timeout for convenience
    if((voiceChannel as Collection<string, GuildMember>).size <= 1 && player.queue.totalSize > 1) {
        player.destroy();
    }

    setTimeout(() => {
        player.play();
    }, 200);
}
