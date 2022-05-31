import axios from "axios";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { Command } from "../../Command";
import { settings } from "../../settings";

export class Define extends Command
{
    constructor()
    {
        super({
            name: "define",
            desc: "Searches for the definition of a term",
            args: [
                {
                    name: "term",
                    desc: "The term to search for",
                    required: true,
                },
                {
                    name: "engine",
                    desc: "Which search engine to use for the term's definition",
                    choices: [
                        { name: "Wikipedia", value: "wikipedia" },
                        { name: "Urban Dictionary", value: "urbandictionary" },
                    ],
                    required: true,
                },
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { term, engine } = this.resolveArgs(int);

        if(!term || term.length < 1 || !["urbandictionary", "wikipedia"].includes(engine))
            return this.reply(int, "Please provide a term to search for and a search engine.");

        await this.deferReply(int, false);

        const embed = new MessageEmbed()
            .setColor(settings.embedColors.default);

        switch(engine)
        {
        case "urbandictionary":
        {
            const req = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
            const obj = req.data?.list[0];

            if(!obj || req.status < 200 || req.status >= 300)
                return this.editReply(int, "Couldn't reach Urban Dictionary. Please try again later.");

            const removeAnnotations = (str: string) => str.replace(/\[([\w\s\d_-]+)\]/gm, "$1");

            const { definition, example, author, thumbs_up, thumbs_down } = obj;

            const def = definition.match(/^n:\s/i) ? String(definition)[0].toUpperCase() + String(definition).substring(4) : definition;

            const ex = example.replace(/(\r?\n){1,2}/gm, "\n> ");

            embed.setTitle(`Urban Dictionary definition for **${term}**:`)
                .setDescription(`${removeAnnotations(def)}\n\n> Example:\n> ${removeAnnotations(ex)}`);

            author && thumbs_up && thumbs_down &&
                embed.setFooter({ text: `By ${author} - ${thumbs_up} 👍 ${thumbs_down} 👎 - https://www.urbandictionary.com` });

            break;
        }
        case "wikipedia":
            return this.editReply(int, "WIP <:angery_bubz:680459945703243851>");
        }

        this.editReply(int, embed);
    }
}
