import { CommandInteraction, EmbedBuilder } from "discord.js";
import { randomItem } from "svcorelib";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { axios } from "@src/utils";

const titles = [
    "One useless fact, coming up",
    "Wow, that's so useless!",
    "Thanks, I learned nothing",
    "Warning: facts contain uselessness",
];

export class Fact extends Command
{
    constructor()
    {
        super({
            name: "fact",
            desc: "Tells you a random, useless fact",
            category: "fun"
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int);

        const { data, status } = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");

        if(status < 200 || status >= 300 || !data.text)
            return await this.editReply(int, "Random Useless Facts is currently unreachable. Please try again later.");

        return this.editReply(int, new EmbedBuilder()
            .setColor(settings.embedColors.default)
            .setTitle(randomItem(titles))
            .setDescription(data.text)
            .setFooter({ text: "https://uselessfacts.jsph.pl/" })
        );
    }
}
