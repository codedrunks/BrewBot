import { CommandInteraction, CommandInteractionOption, ButtonBuilder, EmbedBuilder, EmbedField, ButtonStyle, ApplicationCommandOptionType } from "discord.js";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { Nullable } from "discord-api-types/utils/internals";
import { axios, embedify } from "@src/utils";

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
                            type: ApplicationCommandOptionType.String,
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
            urlParams = `?q=${encodeURIComponent(int.options.get("name", true).value as string)}`;
            ebdTitle = "**{NAME}**:";
        }

        const { data, status, statusText } = await axios.get<CheeseResp>(`https://api.illusionman1212.com/cheese${urlPath}${urlParams}`, { timeout: 10000 });

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
                new ButtonBuilder()
                    .setLabel("Open")
                    .setStyle(ButtonStyle.Link)
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
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(settings.embedColors.default)
            .setFooter({ text: "https://github.com/IllusionMan1212/say-cheese" });

        const embedFields: EmbedField[] = [];

        cheese.image && embed.setThumbnail(cheese.image);
        cheese.description && embed.setDescription(cheese.description.length > 1900 ? cheese.description.substring(0, 1900) + "..." : cheese.description);

        const { countries, types, flavors, textures, aromas, vegetarian } = cheese.attributes;
        const milks = cheese.milks;

        Array.isArray(countries) && countries.length > 0 && embedFields.push({ name: `Countr${countries.length != 1 ? "ies" : "y"}`, value: countries.join(", "), inline: true });
        Array.isArray(types) && types.length > 0 && embedFields.push({ name: `Type${types.length != 1 ? "s" : ""}`, value: types.join(", "), inline: true });
        Array.isArray(milks) && milks.length > 0 && embedFields.push({ name: `Milk${milks.length != 1 ? "s" : ""}`, value: milks.join(", "), inline: true });
        Array.isArray(flavors) && flavors.length > 0 && embedFields.push({ name: `Flavor${flavors.length != 1 ? "s" : ""}`, value: flavors.join(", "), inline: true });
        Array.isArray(textures) && textures.length > 0 && embedFields.push({ name: `Texture${textures.length != 1 ? "s" : ""}`, value: textures.join(", "), inline: true });
        Array.isArray(aromas) && aromas.length > 0 && embedFields.push({ name: `Aroma${aromas.length != 1 ? "s" : ""}`, value: aromas.join(", "), inline: true });
        typeof vegetarian === "boolean" && embedFields.push({ name: "Vegetarian", value: vegetarian ? "yes" : "no", inline: true });

        embed.addFields(embedFields);

        return embed;
    }
}
