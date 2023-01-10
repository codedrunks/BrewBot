import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { randRange } from "svcorelib";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { autoPlural } from "@src/utils";

export class Coinflip extends Command {
    readonly COINS = [
        { name: "Heads", emoji: "🇭" },
        { name: "Tails", emoji: "🇹" },
    ];

    constructor() {
        super({
            name: "coinflip",
            desc: "Flips one or multiple coins",
            perms: [],
            category: "fun",
            args: [
                {
                    name: "amount",
                    desc: "How many coins to flip.",
                    type: ApplicationCommandOptionType.Integer,
                    min: 1,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const amount = int.options.get("amount")?.value as number ?? 1;

        let replyText = "";

        if(amount > 1) {
            const flips = [];
            for(let i = 0; i < amount; i++)
                flips.push(randRange(0, 1));

            replyText = [
                `Flipped ${amount} ${autoPlural("coin", amount)}. Result:`,
                `> ${this.COINS[0].emoji} Heads: **${flips.filter(f => f === 0)}**`,
                `> ${this.COINS[1].emoji} Tails: **${flips.filter(f => f === 1)}**`
            ].join("\n");
        }
        else {
            const coin = this.COINS[randRange(0, 1)];
            replyText = `You flipped a coin.\nIt landed on **${coin.emoji} ${coin.name}**`;
        }

        const embed = new EmbedBuilder()
            .setColor(settings.embedColors.default)
            .setDescription(replyText);

        await this.reply(int, embed);
    }
}
