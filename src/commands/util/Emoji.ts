import { CommandInteraction, ButtonBuilder, EmbedBuilder, ButtonStyle, ApplicationCommandOptionType } from "discord.js";
import { Command } from "@src/Command";
import { settings } from "@src/settings";

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

        const getEmUrl = (id: string, fmt: string) => `https://cdn.discordapp.com/emojis/${id}.${fmt}?size=4096&quality=lossless`;
        const trimmed = (str: string) => str.length > 16 ? str.substring(0, 16) + "+" : str;

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
            const halves = <T>(arr: T[]) => {
                const half = Math.ceil(arr.length / 2);
                const first = arr.slice(0, half);
                const second = arr.slice((arr.length - half) * -1);

                return [first, second];
            };

            await this.reply(int, halves(embeds)[0], false, halves(btns)[0]);

            await int.channel?.send({
                ...Command.useButtons(halves(btns)[1]),
                embeds: halves(embeds)[1],
            });
        }
        else if(embeds.length > 0)
            await this.reply(int, embeds, false, btns);
        else
            await this.reply(int, "Couldn't find the emoji(s) you provided. Note that I can only find custom emojis.", true, btns);
    }
}
