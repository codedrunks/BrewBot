import { CommandInteraction, MessageEmbed } from "discord.js";
import axios from "axios";
import { randomItem } from "svcorelib";
import { Command } from "../Command";
import { settings } from "../settings";

const titles = [
    "Look at this cutie",
    "One ferret, coming up",
    "Ferret time :)"
];

export class Ferret extends Command
{
    constructor()
    {
        super({
            name: "ferret",
            desc: "Displays a random ferret image",
            perms: [],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await int.deferReply();

        const { data, status, statusText } = await axios.get("https://ferretapi.canarado.xyz/");

        if(status < 200 || status >= 300 || !data.file)
            return await this.reply(int, `Ferret API is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`);

        const embed = new MessageEmbed()
            .setTitle(randomItem(titles))
            .setColor(settings.embedColors.default)
            .setFooter({ text: "https://ferret.canarado.xyz" })
            .setImage(data.file);

        await int.editReply({ embeds: [embed] });
    }
}
