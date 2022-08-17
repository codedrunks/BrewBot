import { CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { getCoins, subCoins, addCoins } from "@database/economy";
import { embedify } from "@utils/embedify";
import { createNewMember } from "@src/database/users";

export class Slots extends Command
{
    private readonly SLOTS = new Map([
        ["🍋", .3], // Lemon
        ["🍒", .5], // Cherries
        ["🍌", .7], // Banana
        ["🍓", .9], // Strawberry
        ["🍇", 1], // Grapes
        ["🍉", 2], // Melon
        ["💎", 3], // Diamond
        ["🍆", 4], // Eggplant
    ]);

    constructor()
    {
        super({
            name: "slots",
            desc: "Run a slot machine thingy",
            category: "games",
            perms: [],
            args: [
                {
                    name: "bet",
                    desc: "How many coins you wanna bet",
                    type: "number",
                    min: 100,
                    max: 100000,
                    required: true,
                },
                {
                    name: "slots_grid",
                    desc: "How big is the slot grid",
                    type: "string",
                    choices: [
                        {
                            name: "3x3",
                            value: "3",
                        },
                        {
                            name: "4x4",
                            value: "4",
                        },
                        {
                            name: "5x5",
                            value: "5",
                        },
                    ]
                },
            ]
        });
    }

    checkWin(result: string[], grid: number): (string | null) {
        // check rows
        rows:
        for (let i = 0; i < grid; i++) {
            for (let j = 0; j < grid; j++) {
                if (result[i * grid] !== result[i * grid + j]) {
                    continue rows;
                }
            }

            return result[i];
        }

        // check columns
        cols:
        for (let i = 0; i < grid; i++) {
            for (let j = 0; j < grid; j++) {
                if (result[i] !== result[j * grid + i]) {
                    continue cols;
                }
            }

            return result[i];
        }

        //check diagonals
        let diagWin = 0;
        let reverseDiagWin = 0;

        for (let i = 0; i < grid; i++) {
            if (result[0] === result[i * grid + i]) {
                diagWin++;
            }

            if (result[grid - 1] === result[i * (grid - 1) + (grid - 1)]) {
                reverseDiagWin++;
            }
        }

        if (diagWin === grid) {
            return result[0];
        } else if (reverseDiagWin === grid) {
            return result[grid - 1];
        }

        return null;
    }

    async run(int: CommandInteraction): Promise<void>
    {
        if (!int.guild?.id) return await this.reply(int, "This channel cannot be used in DMs");

        const coins = await getCoins(int.user.id, int.guild.id);

        if (!coins && coins != 0) {
            return await createNewMember(int.guild.id, int.user.id);
        }

        const bet = int.options.getNumber("bet", true);
        const grid = parseInt(int.options.getString("slots_grid") ?? "3");

        if (coins < bet) {
            return await this.reply(int, embedify(`Insufficient coins\nYour balance is: ${coins}`));
        }

        await this.reply(int, "Shuffling slots...");

        let resultStr = "";
        const result = [];
        const emojis = Array.from(this.SLOTS.keys());

        for (let i = 0; i < grid * grid; i++) {
            if (i % grid == 0) {
                resultStr += "\n";
            }
            const rand = emojis[Math.floor(Math.random() * emojis.length)];
            resultStr += rand;
            result.push(rand);
        }

        await this.editReply(int, resultStr);

        const win = this.checkWin(result, grid);

        if (win) {
            const coinsWon = Math.round(bet * this.SLOTS.get(win)!);
            await addCoins(int.user.id, int.guild.id, coinsWon);
            return await this.followUpReply(int, embedify(`Congratulations!\nYou win ${coinsWon + bet} coins`));
        } else {
            await subCoins(int.user.id, int.guild.id, bet);
            return await this.followUpReply(int, embedify(`You lost ${bet} coins. Better luck next time`));
        }
    }
}
