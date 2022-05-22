import { CommandInteraction, MessageEmbed } from "discord.js";
import axios from "axios";
import { randomItem } from "svcorelib";
import { Command } from "../Command";
import { settings } from "../settings";

const titles = [
    "Look at this cutie",
    "One ferret, coming up",
    "Ferret time :)",
    "<a:madeWithAdobe:740517707958452257>",
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
        await this.deferReply(int);

        const { data, status, statusText } = await axios.get("https://ferretapi.canarado.xyz/", { timeout: 10000 });

        if(status < 200 || status >= 300 || !data.file)
            return await this.reply(int, `Ferret API is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`);

        const embed = new MessageEmbed()
            .setTitle(randomItem(titles))
            .setColor(settings.embedColors.default)
            .setFooter({ text: "https://ferret.canarado.xyz" })
            .setImage(data.file);

        await this.editReply(int, embed);
    }
}
