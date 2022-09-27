import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import Fuse from "fuse.js";

import { Command } from "@src/Command";
import { axios, embedify } from "@src/utils";
import { settings } from "@src/settings";
import languages from "@assets/languages.json";
import { isArrayEmpty } from "svcorelib";

export class Translate extends Command
{
    constructor()
    {
        super({
            name: "translate",
            desc: "Translate text",
            category: "util",
            args: [
                {
                    name: "language",
                    desc: "English name of the language to translate to",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "text",
                    desc: "The text to translate",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const text = (int.options.get("text", true).value as string).trim();
        const lang = (int.options.get("language", true).value as string).trim();

        const langs = Object.entries(languages)
            .map(([name, code]) => ({ name, code }));

        const fuse = new Fuse(langs, {
            keys: [ "name" ],
            threshold: 0.5,
        });

        const res = fuse.search(lang);

        if(res.length === 0)
            return await this.reply(int, embedify(`Couldn't find the language \`${lang}\``, settings.embedColors.error), true);

        const resLang = res[0].item;

        await this.deferReply(int);

        const tr = await this.getTranslation(text, resLang.code);

        if(!tr)
            return await this.editReply(int, embedify("Couldn't find a translation for that", settings.embedColors.error));

        const { fromLang, translation } = tr;

        const fromLangName = Object.entries(languages).find(([_n, code]) => code === fromLang)?.[0];
        const toLangName = Object.entries(languages).find(([_n, code]) => code === resLang.code)?.[0];

        const ebd = new EmbedBuilder()
            .setTitle(`Translating ${fromLangName ? `from **${fromLangName}** ` : ""}to **${toLangName}**:`)
            .setColor(settings.embedColors.default)
            .setDescription(`> **Translation:**\n> ${translation}\n\n> **Original text:**\n> ${text}`);

        return await this.editReply(int, ebd);
    }

    async getTranslation(text: string, targetLang: string): Promise<{ fromLang: string, translation: string } | null>
    {
        try
        {
            const { data, status } = await axios.get(`https://translate.googleapis.com/translate_a/single?sl=auto&tl=${targetLang}&q=${encodeURI(text)}&client=gtx&dt=t&ie=UTF-8&oe=UTF-8`);

            if(status < 200 || status >= 300)
                return null;

            const fromLang = data?.[2];
            let trParts = data?.[0];

            if(!fromLang || !trParts)
                return null;

            if(trParts.length > 1)
                trParts = trParts.map((p: string[]) => p?.[0]);
            else
                trParts = [trParts?.[0]?.[0]];

            if(isArrayEmpty(trParts) === true)
                return null;

            const translation = trParts
                .filter((p: unknown) => typeof p === "string")
                .join("").trim();

            return { fromLang, translation };
        }
        catch(err)
        {
            return null;
        }
    }
}
