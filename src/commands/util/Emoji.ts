import { CommandInteraction, MessageButton, MessageEmbed } from "discord.js";
import { Command } from "../../Command";
import { settings } from "../../settings";

export class Emoji extends Command
{
    constructor()
    {
        super({
            name: "emoji",
            desc: "Turns one or more custom emojis into full-sized images for you to download",
            args: [
                {
                    name: "emoji",
                    desc: "Enter one or up to 5 custom emojis",
                    required: true,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { emoji } = this.resolveArgs(int);

        const getEmUrl = (id: string, fmt: string) => `https://cdn.discordapp.com/emojis/${id}.${fmt}?size=4096&quality=lossless`;
        const trimmed = (str: string) => str.length > 16 ? str.substring(0, 16) + "+" : str;

        const embeds: MessageEmbed[] = [];
        const btns: MessageButton[] = [];

        const matches = emoji.match(/<a?:[\p{Letter}\d_]{2,}:(\d{18})>/giu);

        if(matches)
        {
            const emojis = matches
                .slice(0, 5)
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

                const embd = new MessageEmbed()
                    .setColor(settings.embedColors.default)
                    .setImage(em.url);

                em.name && embd.setTitle(`**\\:${em.name}\\:**`);

                embeds.push(embd);

                btns.push(new MessageButton()
                    .setLabel(`:${trimmed(em.name)}:`)
                    .setStyle("LINK")
                    .setURL(em.url)
                );
            }
        }

        if(embeds.length > 0)
            await this.reply(int, embeds, false, btns);
        else
            await this.reply(int, "Couldn't find the emoji(s) you provided. Note that I can only find custom emojis.", true, btns);
    }
}
