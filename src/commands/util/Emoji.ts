import { CommandInteraction, ButtonBuilder, EmbedBuilder, ButtonStyle, ApplicationCommandOptionType } from "discord.js";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { halves } from "svcorelib";
import { Tuple } from "@src/types";

const maxEmojiAmt = 10;

export class Emoji extends Command
{
    constructor()
    {
        super({
            name: "emoji",
            desc: "Turns one or more custom emojis into full-sized images for you to download",
            category: "util",
            args: [
                {
                    name: "emoji",
                    desc: `Enter one or up to ${maxEmojiAmt} custom emojis`,
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const emoji = int.options.get("emoji", true).value as string;

        // TODO: make this URL auto download the image somehow
        const getEmUrl = (id: string, fmt: string) => `https://cdn.discordapp.com/emojis/${id}.${fmt}?size=4096&quality=lossless`;
        const trimmed = (str: string) => str.length > 24 ? str.substring(0, 24) + "+" : str;

        const embeds: EmbedBuilder[] = [];
        const btns: ButtonBuilder[] = [];

        const matches = emoji.match(/<a?:[\p{Letter}\d_]{2,}:(\d{18})>/giu);

        if(matches)
        {
            const emojis = matches
                .slice(0, maxEmojiAmt)
                .map(e => {
                    const spl = e.split(":");
                    const emId = spl.at(-1);
                    const fmt = spl.at(0)?.startsWith("<a") ? "gif" : "png";
                    const url = emId ? getEmUrl(emId.substring(0, emId.length - 1), fmt) : undefined;
                    const name = e.split(":").at(1);
                    return url && name ? { url, name } : undefined ;
                });

            for(const em of emojis)
            {
                if(!em) continue;

                const embd = new EmbedBuilder()
                    .setColor(settings.embedColors.default)
                    .setImage(em.url);

                em.name && embd.setTitle(`**\\:${em.name}\\:**`);

                embeds.push(embd);

                btns.push(new ButtonBuilder()
                    .setLabel(emojis.length === 1 ? "Open" : `:${trimmed(em.name)}:`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(em.url)
                );
            }
        }

        if(embeds.length > 5)
        {
            const [firstEbd, secondEbd] = halves(embeds);
            const [firstBtn, secondBtn] = halves(btns);

            await this.reply(int, firstEbd, false, <Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>>[firstBtn]);

            await int.channel?.send({
                ...Command.useButtons(<Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>>[secondBtn]),
                embeds: secondEbd,
            });
        }
        else if(embeds.length > 0)
            await this.reply(int, embeds, false, <Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>>[btns]);
        else
            await this.reply(int, "Couldn't find the emoji(s) you provided. Note that I can only find custom emojis.", true, <Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>>[btns]);
    }
}
