import { CommandInteraction, EmbedBuilder } from "discord.js";
import { getRandomFerret } from "canarado-ferret-api";
import { randomItem } from "svcorelib";
import { Command } from "@src/Command";
import { settings } from "@src/settings";

const titles = [
    "Look at this cutie",
    "One ferret image, coming up",
    "Ferret time :)",
    "<a:madeWithAdobe:740517707958452257>", // requires the bot being in the CoJ server
];

interface FerretObj {
    url: string;
}

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

        const res = await getRandomFerret() as unknown as FerretObj;

        if(typeof res.url !== "string")
            return await this.reply(int, "Ferret API is currently unreachable. Please try again later.", true);

        const embed = new EmbedBuilder()
            .setTitle(randomItem(titles))
            .setColor(settings.embedColors.default)
            .setFooter({ text: "https://ferret-api.canarado.xyz" })
            .setImage(res.url);

        await this.editReply(int, embed);
    }
}
