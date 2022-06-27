import { CommandInteraction, CommandInteractionOption, MessageEmbed } from "discord.js";
import axios from "axios";
import { Command } from "../../Command";
import { settings } from "../../settings";

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
                    desc: "Gives you the cheese of the day"
                },
                {
                    name: "random",
                    desc: "Gives you a random cheese"
                },
            ]
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        await this.deferReply(int);

        let urlPath = "";
        switch(opt.name)
        {
        case "today":
            urlPath = "/today";
            break;
        case "random":
            urlPath = "/random";
            break;
        }

        const { data, status, statusText } = await axios.get(`https://api.illusionman1212.tech/cheese${urlPath}`, { timeout: 10000 });

        if(status < 200 || status >= 300)
            return await this.editReply(int, `Say Cheese is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`);

        if(data.failed === false)
        {
            const { cheese } = data;

            const embed = new MessageEmbed()
                .setTitle(opt.name === "today" ? `Cheese of the day, **${cheese.name}**:` : `**${cheese.name}**:`)
                .setColor(settings.embedColors.default)
                .setThumbnail(cheese.image)
                .setFooter({ text: "https://github.com/IllusionMan1212/say-cheese" })
                .setDescription(cheese.description);

            const { countries, types, flavors, textures, vegetarian } = cheese.attributes;
            const milks = cheese.milks;

            Array.isArray(countries) && countries.length > 0 && embed.addField(`Countr${countries.length != 1 ? "ies" : "y"}`, countries.join(", "), true);
            Array.isArray(types) && types.length > 0 && embed.addField(`Type${types.length != 1 ? "s" : ""}`, types.join(", "), true);
            Array.isArray(milks) && milks.length > 0 && embed.addField(`Milk${cheese.milks.length != 1 ? "s" : ""}`, cheese.milks.join(", "), true);
            Array.isArray(flavors) && flavors.length > 0 && embed.addField(`Flavor${flavors.length != 1 ? "s" : ""}`, flavors.join(", "), true);
            Array.isArray(textures) && textures.length > 0 && embed.addField(`Texture${textures.length != 1 ? "s" : ""}`, textures.join(", "), true);
            typeof vegetarian === "boolean" && embed.addField("Vegetarian", vegetarian ? "yes" : "no", true);

            return await this.editReply(int, embed);
        }
    }
}
