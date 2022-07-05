import { Client, TextChannel, User } from "discord.js";
import { Player, Track } from "erela.js";
import { embedify } from "@src/util";

export function trackStart(player: Player, track: Track, client: Client) {
    if(!player.textChannel || !player.voiceChannel) return;

    if(player.trackRepeat) return;

    const channel = client.channels.cache.get(player.textChannel);

    if(!channel) return;

    (channel as TextChannel).send({
        embeds: [
            embedify(`Now playing: \`${track.title}\`\n\nRequested By: <@${(track.requester as User).id}>`).setThumbnail(`https://img.youtube.com/vi/${track.identifier}/mqdefault.jpg`)
        ]
    });
}
