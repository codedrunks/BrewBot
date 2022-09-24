import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { getCoins, subCoins, addCoins } from "@database/economy";
import { embedify } from "@utils/embedify";
import { createNewMember } from "@src/database/users";
import { randomItem, randRange } from "svcorelib";

interface Slot {
    emoji: string;
    multiplier: Map<number, number>;
    chance: Map<number, number>;
}

type Pattern = "row" | "column" | "diagonal" | "diagonal-reverse";

export class Slots extends Command
{
    private readonly SLOTS: Slot[] = [
        {
            emoji: "🍆", // Eggplant
            multiplier: new Map([
                [3, 10],
                [4, 100],
                [5, 1000],
            ]),
            chance: new Map([
                [3, 0.01],
                [4, 0.005],
                [5, 0.001],
            ]),
        },
        {
            emoji: "💎", // Diamond
            multiplier: new Map([
                [3, 3],
                [4, 6],
                [5, 9],
            ]),
            chance: new Map([
                [3, 0.05],
                [4, 0.03],
                [5, 0.02],
            ]),
        },
        {
            emoji: "🍉", // Melon
            multiplier: new Map([
                [3, 2],
                [4, 3],
                [5, 5]
            ]),
            chance: new Map([
                [3, 0.1],
                [4, 0.08],
                [5, 0.06]
            ]),
        },
        {
            emoji: "🍇", // Grapes
            multiplier: new Map([
                [3, 1],
                [4, 1.3],
                [5, 1.5],
            ]),
            chance: new Map([
                [3, 0.15],
                [4, 0.13],
                [5, 0.11],
            ]),
        },
        {
            emoji: "🍓", // Strawberry
            multiplier: new Map([
                [3, 0.9],
                [4, 1.1],
                [5, 1.3],
            ]),
            chance: new Map([
                [3, 0.2],
                [4, 0.17],
                [5, 0.15],
            ]),
        },
        {
            emoji: "🍌", // Banana
            multiplier: new Map([
                [3, 0.7],
                [4, 0.9],
                [5, 1.2],
            ]),
            chance: new Map([
                [3, 0.25],
                [4, 0.22],
                [5, 0.2]
            ]),
        },
        {
            emoji: "🍒", // Cherries
            multiplier: new Map([
                [3, 0.5],
                [4, 0.8],
                [5, 1],
            ]),
            chance: new Map([
                [3, 0.3],
                [4, 0.28],
                [5, 0.25],
            ]),
        },
        {
            emoji: "🍋", // Lemon
            multiplier: new Map([
                [3, 0.3],
                [4, 0.5],
                [5, 0.8],
            ]),
            chance: new Map([
                [3, 0.4],
                [4, 0.38],
                [5, 0.35]
            ]),
        }
    ];

    private readonly PATTERNS: Pattern[] = [
        "row",
        "column",
        "diagonal",
        "diagonal-reverse"
    ];

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
                    type: ApplicationCommandOptionType.Number,
                    min: 100,
                    max: 100000,
                    required: true,
                },
                {
                    name: "slots_grid",
                    desc: "How big is the slot grid",
                    type: ApplicationCommandOptionType.String,
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
        await this.deferReply(int);

        if (!int.guild?.id) return await this.editReply(int, "This command cannot be used in DMs");

        const coins = await getCoins(int.user.id, int.guild.id);

        if (!coins && coins != 0) {
            await createNewMember(int.guild.id, int.user.id, 0);
            return;
        }

        const bet = Number(int.options.get("bet", true).value);
        const grid = parseInt(int.options.get("slots_grid")?.value?.toString() ?? "3");

        if (coins < bet) {
            return await this.editReply(int, embedify(`Insufficient coins\nYour balance is: ${coins}`));
        }

        await this.editReply(int, "Shuffling slots...");

        const chance = Math.random();
        let win: Slot | null = null;

        // TODO: a chance of getting your money back (maybe 5%?)

        for (let i = 0; i < this.SLOTS.length; i++) {
            if (chance < this.SLOTS[i].chance.get(grid)!) {
                win = this.SLOTS[i];
                break;
            }
        }

        let resultStr = "";
        const emojis = this.SLOTS.map((slot) => {
            return slot.emoji;
        });

        if (win) {
            const board: string[] = [];

            for (let i = 0; i < grid*grid; i++) {
                board.push(`${i}`);
            }

            const pattern = randomItem(this.PATTERNS);
            const randomNum = randRange(grid - 1);

            switch (pattern) {
            case "row":
                for (let i = 0; i < grid; i++) {
                    for (let j = 0; j < grid; j++) {
                        const rand = emojis[Math.floor(Math.random() * emojis.length)];

                        if (i === randomNum) {
                            resultStr += win.emoji;
                            board[grid * i + j] = win.emoji;
                            continue;
                        }

                        board[grid * i + j] = rand;
                        resultStr += rand;
                    }
                    resultStr += "\n";
                }
                break;
            case "column":
                for (let i = 0; i < grid; i++) {
                    for (let j = 0; j < grid; j++) {
                        const rand = emojis[Math.floor(Math.random() * emojis.length)];

                        if (j === randomNum) {
                            resultStr += win.emoji;
                            board[grid * i + j] = win.emoji;
                            continue;
                        }

                        board[grid * i + j] = rand;
                        resultStr += rand;
                    }
                    resultStr += "\n";
                }
                break;
            case "diagonal":
                for (let i = 0; i < grid; i++) {
                    for (let j = 0; j < grid; j++) {
                        const rand = emojis[Math.floor(Math.random() * emojis.length)];

                        if (i === j) {
                            resultStr += win.emoji;
                            board[grid * i + j] = win.emoji;
                            continue;
                        }

                        board[grid * i + j] = rand;
                        resultStr += rand;
                    }
                    resultStr += "\n";
                }
                break;
            case "diagonal-reverse":
                for (let i = 0; i < grid; i++) {
                    for (let j = 0; j < grid; j++) {
                        const rand = emojis[Math.floor(Math.random() * emojis.length)];

                        if ((i + j) === (grid - 1)) {
                            resultStr += win.emoji;
                            board[grid * i + j] = win.emoji;
                            continue;
                        }

                        board[grid * i + j] = rand;
                        resultStr += rand;
                    }
                    resultStr += "\n";
                }
                break;
            default:
                throw new Error("Unrecognized slots pattern");
            }

            const winningEmoji = this.checkWin(board, grid);

            let coinsWon = Math.round(bet * win.multiplier.get(grid)!);

            if (winningEmoji && winningEmoji !== win.emoji) {
                coinsWon += bet * this.SLOTS.find((slot) => slot.emoji === winningEmoji)!.multiplier.get(grid)!;
            }

            await this.editReply(int, resultStr);

            await addCoins(int.user.id, int.guild.id, coinsWon);
            return await this.followUpReply(int, embedify(`Congratulations!\nYou win ${coinsWon + bet} coins`));
        } else {
            const board: string[] = [];

            for (let i = 0; i < grid*grid; i++) {
                board.push(`${i}`);
            }

            for (let i = 0; i < grid; i++) {
                for (let j = 0; j < grid; j++) {
                    let rand = emojis[Math.floor(Math.random() * emojis.length)];

                    board[grid * i + j] = rand;

                    while (this.checkWin(board, grid)) {
                        rand = emojis[Math.floor(Math.random() * emojis.length)];
                        board[grid * i + j] = rand;
                    }

                    resultStr += rand;
                }
                resultStr += "\n";
            }

            await this.editReply(int, resultStr);
            await subCoins(int.user.id, int.guild.id, bet);
            return await this.followUpReply(int, embedify(`You lost ${bet} coins. Better luck next time`));
        }
    }
}
