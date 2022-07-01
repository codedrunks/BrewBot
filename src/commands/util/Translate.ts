import { CommandInteraction, MessageEmbed } from "discord.js";
import axios from "axios";
import Fuse from "fuse.js";
import { Command } from "@src/Command";
import languages from "@src/languages.json";
import { embedify } from "@src/util";
import { settings } from "@src/settings";
import { allOfType } from "svcorelib";

export class Translate extends Command
{
    constructor()
    {
        super({
            name: "translate",
            desc: "Translate text",
            args: [
                {
                    name: "text",
                    desc: "The text to translate",
                    required: true,
                },
                {
                    name: "language",
                    desc: "Name of the language to translate to",
                    required: true,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int);

        const text = int.options.getString("text", true).trim();
        const lang = int.options.getString("language", true);

        const fuse = new Fuse(
            Object.entries(languages).map(([k, v]) => ({ code: k, name: v })),
            {
                keys: [ "name" ],
                threshold: 0.5,
                findAllMatches: true,
            }
        );

        const res = fuse.search(lang);

        if(res.length === 0)
            return await this.editReply(int, embedify("Couldn't find that language", settings.embedColors.error));

        const resLang = res[0].item;

        const tr = await this.getTranslation(text, resLang.code);

        if(!tr)
            return await this.editReply(int, embedify("Couldn't find a translation for that", settings.embedColors.error));

        const { fromLang, translation } = tr;

        const fromLangName = (languages as Record<string, string>)[fromLang];

        const ebd = new MessageEmbed()
            .setTitle(`Translating ${fromLangName ? `from **${fromLangName}** ` : ""}to **${resLang.name}**:`)
            .setColor(settings.embedColors.default)
            .setDescription(`> **Text:**\n> ${text}\n\n> **Translation:**\n> ${translation}`);

        return await this.editReply(int, ebd);
    }

    async getTranslation(text: string, targetLang: string): Promise<{ fromLang: string, translation: string } | null>
    {
        try
        {
            const { data, status } = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&ie=UTF-8&oe=UTF-8&sl=auto&tl=${targetLang}&q=${encodeURI(text)}`);

            if(status < 200 || status >= 300)
                return null;

            let fromLang = data?.[2];
            const translation = data?.[0]?.[0]?.[0];

            if(fromLang.match(/^\w+-\w+$/))
                fromLang = fromLang.split("-")[0];

            return allOfType([fromLang, translation], "string") ? { fromLang, translation } : null;
        }
        catch(err)
        {
            return null;
        }
    }
}
