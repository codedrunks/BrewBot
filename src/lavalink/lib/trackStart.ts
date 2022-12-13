import { Client, GuildTextBasedChannel, TextChannel, User } from "discord.js";
import { Player, Track } from "erela.js";
import { embedify } from "@utils/embedify";
import { fetchSongInfo, formatTitle } from "@src/commands/music/global.music";
import { getPremium } from "@src/database/music";
import { emojis } from "@src/utils";

export async function trackStart(player: Player, track: Track, client: Client) {
    if(!player.textChannel || !player.voiceChannel) return;
    if(player.trackRepeat) return;

    const channel = client.channels.cache.get(player.textChannel) as GuildTextBasedChannel;

    if(!channel) return;

    let lyricsLink = "";
    if(await getPremium(channel.guild.id))
    {
        // TODO: don't await, just edit the sent message later on
        const lyrics = await fetchSongInfo(track.title);
        if(lyrics?.url)
            lyricsLink = `Lyrics: [click to open ${emojis.openInBrowser}](${lyrics.url})\n`;
    }

    (channel as TextChannel).send({
        embeds: [
            embedify(`Now playing: ${formatTitle(track)}\n${lyricsLink}\nRequested By: <@${(track.requester as User).id}>`).setThumbnail(`https://img.youtube.com/vi/${track.identifier}/mqdefault.jpg`)
        ]
    });
}
