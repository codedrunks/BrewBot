import { Client, TextChannel } from "discord.js";
import { Player } from "erela.js";
import { embedify } from "@utils/embedify";

export function queueEnd(player: Player, client: Client) {
    if(!player.textChannel) return;

    const channel = client.channels.cache.get(player.textChannel);

    if(!channel) return;

    (channel as TextChannel).send({
        embeds: [
            embedify("Queue ended, leaving in 1 minute")
        ]
    });

    setTimeout(() => {
        if(!player.playing && !player.paused && player.queue.size == 0) player.destroy();
    }, 55_000);
}
