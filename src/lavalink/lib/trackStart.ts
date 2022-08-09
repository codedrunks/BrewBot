import { Client, GuildTextBasedChannel, TextChannel, User } from "discord.js";
import { Player, Track } from "erela.js";
import { embedify } from "@utils/embedify";
import { fetchLyricsUrl } from "@src/commands/music/global.music";
import { getPremium } from "@src/database/music";

export async function trackStart(player: Player, track: Track, client: Client) {
    if(!player.textChannel || !player.voiceChannel) return;

    if(player.trackRepeat) return;

    const channel = client.channels.cache.get(player.textChannel) as GuildTextBasedChannel;

    if(!channel) return;

    let lyricsLink = "";
    if(await getPremium(channel.guild.id))
    {
        const lyrics = await fetchLyricsUrl(track.title);
        if(lyrics)
            lyricsLink = `Lyrics: [click to open <:open_in_browser:994648843331309589>](${lyrics})\n`;
    }

    (channel as TextChannel).send({
        embeds: [
            embedify(`Now playing: [${track.title}](${track.uri})\n${lyricsLink}\nRequested By: <@${(track.requester as User).id}>`).setThumbnail(`https://img.youtube.com/vi/${track.identifier}/mqdefault.jpg`)
        ]
    });
}
