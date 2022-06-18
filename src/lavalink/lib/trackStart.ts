import { Client, TextChannel, User } from "discord.js";
import { Player, Track } from "erela.js";
import { embedify } from "../../util";

export function trackStart(player: Player, track: Track, client: Client) {
    if(!player.textChannel) return;

    const channel = client.channels.cache.get(player.textChannel);

    if(!channel) return;

    // embedify(`Now playing: \`${track.title}\`\nRequested By: \`${(track.requester as User).tag}\``)
    (channel as TextChannel).send({
        embeds: [
            embedify(`Now playing: \`${track.title}\`\nRequested By: \`${(track.requester as User).tag}\``)
        ]
    });
}
