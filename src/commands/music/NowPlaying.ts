import { CommandInteraction, GuildMemberRoleManager, MessageButton, User } from "discord.js";
import { Command } from "@src/Command";
import { getMusicManager } from "@src/lavalink/client";
import { embedify, musicReadableTimeString, BtnMsg } from "@src/utils";
import { formatDuration, parseDuration } from "svcorelib";
import { getPremium, isDJOnlyandhasDJRole } from "@src/database/music";
import { fetchLyricsUrl } from "./global.music";

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

        let lyricsLink = "";
        if(await getPremium(int.guild.id))
        {
            const lyrics = await fetchLyricsUrl(current.title);
            if(lyrics)
                lyricsLink = `Lyrics: [click to open <:open_in_browser:994648843331309589>](${lyrics})\n`;
        }

        const embed = embedify(
            `Artist: \`${current.author}\`\n${lyricsLink}\n\`${current.isStream ? formatDuration(player.position, "%h:%m:%s", true) : readableTime}\`\nRequested by: <@${(current.requester as User).id}>`
        ).setThumbnail(`https://img.youtube.com/vi/${current.identifier}/mqdefault.jpg`).setTitle(`${current.title}`);

        if(current?.uri) embed.setURL(current.uri);

        const btns: MessageButton[] = [
            new MessageButton().setEmoji("⏪").setLabel("- 10s").setStyle("PRIMARY"),
            new MessageButton().setEmoji("⏯️").setLabel("Pause/Resume").setStyle("PRIMARY"),
            new MessageButton().setEmoji("⏩").setLabel("+ 10s").setStyle("PRIMARY"),
            new MessageButton().setEmoji("⏭").setLabel("Skip").setStyle("PRIMARY"),
            new MessageButton().setEmoji("⏹️").setLabel("Stop").setStyle("PRIMARY")
        ];

        const button = new BtnMsg(embed, btns, { timeout: current.isStream ? -1 : (current.duration as number) - player.position });

        button.on("press", async (b, i) => {
            await i.deferUpdate();

            if(i.user.id !== int.user.id) return;

            const djCheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);
            if(djCheck) return this.followUpReply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"), true);

            if(!player || !player.queue.current) return;

            switch(b.label) {
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

        await int.editReply({ ...button.getReplyOpts(), embeds: [ embed ]});
    }
}
