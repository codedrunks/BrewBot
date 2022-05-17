import { CommandInteraction, MessageEmbed } from "discord.js";
import { randRange } from "svcorelib";
import { Command, CommandMeta } from "../Command";
import { settings } from "../settings";

// idx 0: heads, idx 1: tails - TODO: make some sexy emoji for this specifically maybe?
const coins = ["🇭","🇹"];

export class Coinflip extends Command {
    constructor()
    {
        const meta: CommandMeta = {
            name: "coinflip",
            desc: "Flips one or multiple coins",
            perms: [],
            args: [
                {
                    name: "amount",
                    desc: "How many coins to flip. Must be between 1 and 50"
                }
            ]
        };

        super(meta);
    }

    async run(int: CommandInteraction): Promise<void> {
        const args = this.resolveArgs(int);

        let replyText = "";

        if(args.amount)
        {
            const amount = parseInt(args.amount);

            if(isNaN(amount) || amount < 1 || amount > 50)
            {
                await this.reply(int, "Please enter a valid amount between 1 and 50");
                return;
            }

            const flips = [];
            for(let i = 0; i < amount; i++)
                flips.push(coins[randRange(0, 1)]);

            replyText = `Flipped ${amount} coin${amount != 1 ? "s" : ""}. Result:\n\n${flips.join(" ")}`;
        }
        else
            replyText = `You flipped a coin: ${coins[randRange(0, 1)]}`;

        const embed = new MessageEmbed()
            .setColor(settings.embedColors.default)
            .setDescription(replyText);

        await this.reply(int, embed, false);
    }
}
