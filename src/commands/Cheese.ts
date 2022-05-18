import { CommandInteraction, CommandInteractionOption, MessageEmbed } from "discord.js";
import axios from "axios";
import { Command } from "../Command";
import { settings } from "../settings";

export class Cheese extends Command
{
    constructor()
    {
        super({
            name: "cheese",
            desc: "For your cheesy needs",
            perms: [],
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
        await int.deferReply();

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

        const { data, status, statusText } = await axios.get(`https://api.illusionman1212.tech/cheese${urlPath}`);

        if(status < 200 || status >= 300)
        {
            await int.editReply(`Say Cheese is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`);
            return;
        }

        if(data.failed === false)
        {
            const { cheese } = data;

            const embed = new MessageEmbed()
                .setTitle(opt.name === "today" ? `Cheese of the day, **${cheese.name}**:` : `**${cheese.name}**:`)
                .setColor(settings.embedColors.default)
                .setThumbnail(cheese.image)
                .setFooter({ text: "https://github.com/IllusionMan1212/say-cheese" })
                .addField("Description", cheese.description, false)
                .addField(`Countr${cheese.attributes.countries.length != 1 ? "ies" : "y"}`, cheese.attributes.countries.join(", "), true)
                .addField(`Type${cheese.attributes.types.length != 1 ? "s" : ""}`, cheese.attributes.types.join(", "), true)
                .addField(`Milk${cheese.milks.length != 1 ? "s" : ""}`, cheese.milks.join(", "), true)
                .addField(`Flavor${cheese.attributes.flavors.length != 1 ? "s" : ""}`, cheese.attributes.flavors.join(", "), true)
                .addField(`Texture${cheese.attributes.textures.length != 1 ? "s" : ""}`, cheese.attributes.textures.join(", "), true)
                .addField("Vegetarian", cheese.attributes.vegetarian ? "yes" : "no", true);

            await int.editReply({ embeds: [embed] });
            return;
        }
    }
}
