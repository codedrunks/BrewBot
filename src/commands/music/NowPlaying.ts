import { CommandInteraction, GuildMemberRoleManager, ButtonBuilder, User, ButtonStyle } from "discord.js";
import { Command } from "@src/Command";
import { getMusicManager } from "@src/lavalink/client";
import { embedify, musicReadableTimeString, BtnMsg, emojis } from "@src/utils";
import { formatDuration, parseDuration } from "svcorelib";
import { getPremium, isDJOnlyandhasDJRole } from "@src/database/music";
import { fetchSongInfo, SongInfo } from "./global.music";
import { Tuple } from "@src/types";

const ten_secs = 10_000;

export class NowPlaying extends Command {
    constructor() {
        super({
            name: "nowplaying",
            desc: "Shows the current playing song",
            category: "music"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        await this.deferReply(int);

        const guild = int.guild;

        if(!guild) return this.editReply(int, embedify("This command cannot be used in DM's"));

        const manager = getMusicManager();

        const player = manager.get(guild.id);

        const current = player?.queue.current;

        if(!player || !current) return this.editReply(int, embedify("There is no music playing in this server"));

        const currentTime = parseDuration(player.position);
        const duration = parseDuration(current?.duration as number);

        const readableTime = musicReadableTimeString(currentTime, duration);

        const getNowPlayingEmbed = (info?: SongInfo, lyricsLink?: string) => {
            const embed = embedify(`Artist: \`${info?.meta.artists ?? current.author}\`${lyricsLink ?? ""}\n\`${current.isStream ? formatDuration(player.position, "%h:%m:%s", true) : readableTime}\`\nRequested by: <@${(current.requester as User).id}>`)
                .setThumbnail(`https://img.youtube.com/vi/${current.identifier}/mqdefault.jpg`)
                .setTitle(`${current.title}`);
            if(current?.uri) embed.setURL(current.uri);
            return embed;
        };

        const embed = getNowPlayingEmbed();

        const btns: Tuple<Tuple<ButtonBuilder, 5>, 1> = [[
            new ButtonBuilder().setEmoji("⏪").setLabel("- 10s").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setEmoji("⏯️").setLabel("Pause/Resume").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setEmoji("⏩").setLabel("+ 10s").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setEmoji("⏭").setLabel("Skip").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setEmoji("⏹️").setLabel("Stop").setStyle(ButtonStyle.Secondary)
        ]];

        const button = new BtnMsg(embed, btns, { timeout: current.isStream ? -1 : (current.duration as number) - player.position });

        button.on("press", async (b, i) => {
            await i.deferUpdate();

            if(i.user.id !== int.user.id) return;

            const djCheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);
            if(djCheck) return this.followUpReply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"), true);

            if(!player || !player.queue.current) return;

            switch(b.data.label) {
            case "- 10s":
                player.seek(player.position - ten_secs);
                break;
            case "Pause/Resume":
                player.pause(!player.paused);
                break;
            case "+ 10s":
                player.seek(player.position + ten_secs);
                break;
            case "Skip":
                player.stop();
                button.emit("timeout");
                break;
            case "Stop":
                player.destroy();
                button.emit("timeout");
                break;
            case "Shuffle":
                player.queue.shuffle();
                break;
            }
        });

        button.once("timeout", async () => {
            await this.deleteReply(int);
            button.destroy();
        });

        await int.editReply({ ...button.getReplyOpts(), embeds: [ getNowPlayingEmbed() ]});

        if(await getPremium(int.guild.id))
        {
            const info = await fetchSongInfo(current.title);
            if(!info) return;
            let lyricsLink;

            if(info?.url)
                lyricsLink = `Lyrics: [click to open ${emojis.openInBrowser}](${info.url})\n`;

            await int.editReply({ ...button.getReplyOpts(), embeds: [ getNowPlayingEmbed(info, lyricsLink) ] });
        }
    }
}
