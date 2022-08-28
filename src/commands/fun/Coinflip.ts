import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { randRange } from "svcorelib";
import { Command } from "@src/Command";
import { settings } from "@src/settings";

// idx 0: heads, idx 1: tails - TODO: make some sexy emoji for this specifically maybe?
const coins = ["🇭","🇹"];

export class Coinflip extends Command {
    constructor()
    {
        super({
            name: "coinflip",
            desc: "Flips one or multiple coins",
            perms: [],
            category: "fun",
            args: [
                {
                    name: "amount",
                    desc: "How many coins to flip.",
                    type: ApplicationCommandOptionType.Number,
                    min: 1,
                    max: 50,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const args = this.resolveArgs(int);

        let replyText = "";

        if(args.amount)
        {
            const amount = parseInt(args.amount);

            const flips = [];
            for(let i = 0; i < amount; i++)
                flips.push(coins[randRange(0, 1)]);

            replyText = `Flipped ${amount} coin${amount != 1 ? "s" : ""}. Result:\n\n${flips.join(" ")}`;
        }
        else
            replyText = `You flipped a coin: ${coins[randRange(0, 1)]}`;

        const embed = new EmbedBuilder()
            .setColor(settings.embedColors.default)
            .setDescription(replyText);

        await this.reply(int, embed);
    }
}
