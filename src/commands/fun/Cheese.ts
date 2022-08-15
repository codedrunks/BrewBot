import { CommandInteraction, CommandInteractionOption, MessageButton, MessageEmbed } from "discord.js";
import axios from "axios";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { Nullable } from "discord-api-types/utils/internals";
import { embedify } from "@src/utils";

interface CheeseObj {
    name: string;
    description: string;
    link: string;
    image: string | null;
    milks: string[] | null;
    attributes: Nullable<{
        countries: string;
        types: string;
        flavors: string[];
        textures: string[];
        aromas: string[];
        vegetarian: string;
    }>;
}

type CheeseResp = {
    failed: boolean;
    status: string;
} & ({
    cheese: CheeseObj;
} | {
    cheeses: CheeseObj[];
});

export class Cheese extends Command
{
    constructor()
    {
        super({
            name: "cheese",
            desc: "For your cheesy needs",
            perms: [],
            category: "fun",
            subcommands: [
                {
                    name: "today",
                    desc: "Gives you the cheese of the day",
                },
                {
                    name: "random",
                    desc: "Gives you a random cheese",
                },
                {
                    name: "search",
                    desc: "Search for a cheese by its name",
                    args: [
                        {
                            name: "name",
                            desc: "The name of the cheese",
                            required: true,
                        },
                    ],
                },
            ],
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        await this.deferReply(int);

        let urlPath = "", urlParams = "", ebdTitle = "";

        switch(opt.name)
        {
        case "today":
            urlPath = "/today";
            ebdTitle = "Cheese of the day, **{NAME}**:";
            break;
        case "random":
            urlPath = "/random";
            ebdTitle = "Random cheese, **{NAME}**:";
            break;
        case "search":
            urlPath = "/search";
            urlParams = `?q=${encodeURIComponent(int.options.getString("name", true))}`;
            ebdTitle = "**{NAME}**:";
        }

        const { data, status, statusText } = await axios.get<CheeseResp>(`https://api.illusionman1212.tech/cheese${urlPath}${urlParams}`, { timeout: 10000 });

        if(status < 200 || status >= 300)
            return await this.editReply(int, embedify(`Say Cheese is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`, settings.embedColors.error));

        if(data.failed === false)
        {
            // TS was a fucking mistake
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const cheese: CheeseObj | undefined = data?.cheese ?? data?.cheeses?.[0];

            if(!cheese)
                return this.editReply(int, embedify("Couldn't find this cheese.", settings.embedColors.error));

            const embed = this.embedifyCheese(cheese, ebdTitle.replace("{NAME}", cheese.name));

            const btn = cheese.link ?
                new MessageButton()
                    .setLabel("Open")
                    .setStyle("LINK")
                    .setURL(cheese.link)
                : undefined;

            await int.editReply({
                embeds: [ embed ],
                ...Command.useButtons(btn),
            });

            return await this.editReply(int, embed);
        }
    }

    embedifyCheese(cheese: CheeseObj, title: string)
    {
        const embed = new MessageEmbed()
            .setTitle(title)
            .setColor(settings.embedColors.default)
            .setFooter({ text: "https://github.com/IllusionMan1212/say-cheese" });

        cheese.image && embed.setThumbnail(cheese.image);
        cheese.description && embed.setDescription(cheese.description.length > 1900 ? cheese.description.substring(0, 1900) + "..." : cheese.description);

        const { countries, types, flavors, textures, aromas, vegetarian } = cheese.attributes;
        const milks = cheese.milks;

        Array.isArray(countries) && countries.length > 0 && embed.addField(`Countr${countries.length != 1 ? "ies" : "y"}`, countries.join(", "), true);
        Array.isArray(types) && types.length > 0 && embed.addField(`Type${types.length != 1 ? "s" : ""}`, types.join(", "), true);
        Array.isArray(milks) && milks.length > 0 && embed.addField(`Milk${milks.length != 1 ? "s" : ""}`, milks.join(", "), true);
        Array.isArray(flavors) && flavors.length > 0 && embed.addField(`Flavor${flavors.length != 1 ? "s" : ""}`, flavors.join(", "), true);
        Array.isArray(textures) && textures.length > 0 && embed.addField(`Texture${textures.length != 1 ? "s" : ""}`, textures.join(", "), true);
        Array.isArray(aromas) && aromas.length > 0 && embed.addField(`Aroma${aromas.length != 1 ? "s" : ""}`, aromas.join(", "), true);
        typeof vegetarian === "boolean" && embed.addField("Vegetarian", vegetarian ? "yes" : "no", true);

        return embed;
    }
}
