import { embedify } from "@utils/embedify";
import { Client, TextChannel } from "discord.js";
import { Player } from "erela.js";

export function playerMove(player: Player, oldChannel: string, newChannel: string, client: Client) { // eslint-disable-line
    if(!player.textChannel) return;
    
    if(!newChannel) {
        const channel = client.channels.cache.get(player.textChannel);

        (channel as TextChannel).send({
            embeds: [
                embedify("Forcefully disconnected from the voice channel, clearing the queue")
            ]
        });

        return player.destroy();
    }
    
    player.setVoiceChannel(newChannel);

    const channel = client.channels.cache.get(player.textChannel);

    (channel as TextChannel).send({
        embeds: [
            embedify(`Moved from <#${oldChannel}> to <#${newChannel}>`)
        ]
    });

    if(player.paused) return;

    setTimeout(() => {
        player.pause(true);
        setTimeout(() => {
            player.pause(false);
        }, 400);
    }, 400);
}
