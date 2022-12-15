import { Client, GuildTextBasedChannel, Message, TextChannel, User } from "discord.js";
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

    const getNowPlayingEmbed = (track: Track, lyricsLink?: string) =>
        embedify([
            `Now playing: ${formatTitle(track)}${lyricsLink ?? ""}`,
            `Requested By: <@${(track.requester as User).id}>`
        ].join("\n")).setThumbnail(`https://img.youtube.com/vi/${track.identifier}/mqdefault.jpg`);

    const msg = (channel as TextChannel).send({
        embeds: [ getNowPlayingEmbed(track) ],
    });

    if(await getPremium(channel.guild.id)) {
        const info = await fetchSongInfo(track.title);
        if(!info) return;
        let lyricsLink;

        if(info?.url)
            lyricsLink = `Lyrics: [click to open ${emojis.openInBrowser}](${info.url})\n`;

        (msg instanceof Message ? msg : await msg).edit({
            embeds: [ getNowPlayingEmbed(track, lyricsLink) ],
        }).catch((e) => void e);
    }
}
