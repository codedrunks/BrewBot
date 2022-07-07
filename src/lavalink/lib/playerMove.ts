import { embedify } from "@src/util";
import { Client, TextChannel } from "discord.js";
import { Player } from "erela.js";

export function playerMove(player: Player, oldChannel: string, newChannel: string, client: Client) { // eslint-disable-line
    if(!newChannel) {
        return player.destroy();
    }

    if(!player.textChannel) return;
    
    player.voiceChannel = newChannel;

    const channel = client.channels.cache.get(player.textChannel);

    (channel as TextChannel).send({
        embeds: [
            embedify(`Moved from <#${oldChannel}> to <#${newChannel}>`)
        ]
    });

    setTimeout(() => {
        player.pause(true);
        setTimeout(() => {
            player.pause(false);
        }, 400);
    }, 400);
}
