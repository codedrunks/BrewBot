import { CommandInteraction, EmbedBuilder } from "discord.js";
import { randomItem } from "svcorelib";
import { Command } from "@src/Command";
import { axios } from "@src/utils";
import { settings } from "@src/settings";

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
            category: "fun",
            perms: [],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int);

        const { data, status, statusText } = await axios.get("https://ferret-api.canarado.xyz/api/random", { timeout: 10000 });

        if(status < 200 || status >= 300 || !data.url)
            return await this.reply(int, `Ferret API is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`, true);

        const embed = new EmbedBuilder()
            .setTitle(randomItem(titles))
            .setColor(settings.embedColors.default)
            .setFooter({ text: "https://ferret-api.canarado.xyz" })
            .setImage(data.url);

        await this.editReply(int, embed);
    }
}
