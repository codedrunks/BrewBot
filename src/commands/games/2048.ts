import {
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CommandInteraction,
    CommandInteractionOption,
    EmbedBuilder,
} from "discord.js";
import { Command } from "@src/Command";
import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { settings } from "@src/settings";
import { bold } from "@discordjs/builders";
import { BtnMsg, embedify } from "@src/utils";

interface Game {
    board: number[][];
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    bm: BtnMsg;
    score: number;
}

interface Cell {
    x: number;
    y: number;
}

interface ColorsMap {
    [num: number]: {
        bgColor: string;
        textColor: TextColors;
        fontSize: string;
        shadow: {
            color: string;
            blur: number
        } | null;
    }
}

function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.arcTo(x, y + height, x + radius, y + height, radius);
    ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
    ctx.arcTo(x + width, y, x + width - radius, y, radius);
    ctx.arcTo(x, y, x, y + radius, radius);
    ctx.fill();
}

enum Buttons {
    LEFT = "1014153035418701875",
    RIGHT = "1014153037318725684",
    UP = "1014153040196026458",
    DOWN = "1014153032474304564",
}

enum TextColors {
    LIGHT = "#F9F6F2",
    DARK = "#776E65",
}

const colorsMap: ColorsMap = {
    2: {
        bgColor: "#EEE4DA",
        textColor: TextColors.DARK,
        fontSize: "105px",
        shadow: null,
    },
    4: {
        bgColor: "#EEE1C9",
        textColor: TextColors.DARK,
        fontSize: "105px",
        shadow: null,
    },
    8: {
        bgColor: "#F3B27A",
        textColor: TextColors.LIGHT,
        fontSize: "105px",
        shadow: null,
    },
    16: {
        bgColor: "#F69664",
        textColor: TextColors.LIGHT,
        fontSize: "105px",
        shadow: null,
    },
    32: {
        bgColor: "#F77C5F",
        textColor: TextColors.LIGHT,
        fontSize: "105px",
        shadow: null,
    },
    64: {
        bgColor: "#F75F3B",
        textColor: TextColors.LIGHT,
        fontSize: "105px",
        shadow: null,
    },
    128: {
        bgColor: "#EDD073",
        textColor: TextColors.LIGHT,
        fontSize: "90px",
        shadow: {
            color: "#EDD073",
            blur: 10,
        },
    },
    256: {
        bgColor: "#EDCC61",
        textColor: TextColors.LIGHT,
        fontSize: "90px",
        shadow: {
            color: "#EDCC61",
            blur: 15,
        },
    },
    512: {
        bgColor: "#EDC850",
        textColor: TextColors.LIGHT,
        fontSize: "90px",
        shadow: {
            color: "#EDC850",
            blur: 20,
        },
    },
    1024: {
        bgColor: "#EDC53F",
        textColor: TextColors.LIGHT,
        fontSize: "75px",
        shadow: {
            color: "#EDC53F",
            blur: 25,
        },
    },
    2048: {
        bgColor: "#EDC22E",
        textColor: TextColors.LIGHT,
        fontSize: "75px",
        shadow: {
            color: "#EDC22E",
            blur: 30,
        },
    }
};

export class TwentyFortyEight extends Command {
    private readonly GAP_SIZE = 30;
    private readonly CELL_COUNT = 4;
    private readonly CELL_SIZE = 200;
    private readonly BOARD_WIDTH =
        this.CELL_COUNT * this.CELL_SIZE +
        this.GAP_SIZE * (this.CELL_COUNT + 1); // 950
    private readonly BOARD_HEIGHT =
        this.CELL_COUNT * this.CELL_SIZE +
        this.GAP_SIZE * (this.CELL_COUNT + 1); // 950

    private readonly games = new Map<string, Game>();

    constructor() {
        super({
            name: "2048",
            desc: "Play a game of 2048",
            category: "games",
            subcommands: [
                {
                    name: "start",
                    desc: "Start a new game of 2048 (games are globally unique?)",
                },
                {
                    name: "discard",
                    desc: "Discard your active 2048 game",
                },
                {
                    name: "leaderboard",
                    desc: "Displays a leaderboard of highscores and games played.",
                    args: [
                        {
                            name: "local",
                            desc: "Whether to show server or global leaderboard. Defaults to local",
                            type: ApplicationCommandOptionType.Boolean,
                        },
                    ],
                },
            ],
        });

    }

    async run(
        int: CommandInteraction,
        opt: CommandInteractionOption<"cached">
    ): Promise<void> {
        await this.deferReply(int);

        switch (opt.name) {
        case "start":
            return await this.start(int);
        case "discard":
            return await this.discard(int);
        case "leaderboard":
            return await this.leaderboard(int);
        }
    }

    /////////////////////////
    /// Command Functions ///
    /////////////////////////

    async start(int: CommandInteraction) {
        const user = int.user;
        // if (this.games.has(user.id)) {
        //     return await this.editReply(int, embedify("You already have a game running! Games are unique globally and not by server"));
        // }

        const canvas = createCanvas(this.BOARD_WIDTH, this.BOARD_HEIGHT);
        const ctx = canvas.getContext("2d");

        const bm = new BtnMsg(
            new EmbedBuilder().setTitle("Placeholder"),
            [
                new ButtonBuilder().setStyle(ButtonStyle.Primary).setEmoji(Buttons.LEFT),
                new ButtonBuilder().setStyle(ButtonStyle.Primary).setEmoji(Buttons.RIGHT),
                new ButtonBuilder().setStyle(ButtonStyle.Primary).setEmoji(Buttons.UP),
                new ButtonBuilder().setStyle(ButtonStyle.Primary).setEmoji(Buttons.DOWN),
            ],
            { timeout: 1000 * 60 * 5 }
        );

        this.games.set(user.id, {
            board: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
            score: 0,
            canvas: canvas,
            ctx: ctx,
            bm: bm,
        });

        const game = this.games.get(user.id)!;

        bm.on("press", async (b, i) => {
            await i.deferUpdate();
            this.onPress(i, b, game, user.id);
        });

        bm.on("timeout", async () => {
            // TODO: remove this line when sv's branch is merged
            bm.btns.map((btn) => btn.setDisabled(true));
            int.editReply({ ...bm.getReplyOpts() });
            await this.cleanUpGame(user.id);
        });

        this.generateInitialBoard(game);

        this.drawBoard(game);
        await this.renderBoard(game, user.id);
        return await this.sendBoard(int, user.id, game);
    }

    async leaderboard(int: CommandInteraction) {
        // TODO: implement this
        throw new Error("Method not implemented.");
    }

    async discard(int: CommandInteraction) {
        const user = int.user;
        const game = this.games.get(user.id);
        if (!game) {
            return await this.editReply(int, embedify("You don't have a game running. Start one with `/2048 start`"));
        }

        this.games.delete(user.id);
        await fs.rm(path.join(os.tmpdir(), `${user.id}-2048.png`));
        return await this.editReply(int, embedify("Game discarded successfully. Start a new one with `/2048 start`"));
    }

    ////////////////////////////
    /// Game Logic Functions ///
    ////////////////////////////

    generateInitialBoard(game: Game) {
        for (let i = 0; i < 2; i++) {
            const cells = this.getAvailableCells(game);
            const randomCell = cells[Math.floor(Math.random() * cells.length)];
            game.board[randomCell.y][randomCell.x] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    // TODO: make this return an array of numbers
    moveLeft(game: Game) {
        const mergedCells: Cell[] = [];

        for (let y = 0; y < this.CELL_COUNT; y++) {
            for (let x = 1; x < this.CELL_COUNT; x++) {
                if (game.board[y][x] === 0) {
                    continue;
                }

                let tempX = x;
                do {
                    tempX--;

                    if (game.board[y][tempX] === 0) {
                        continue;
                    }

                    if (game.board[y][tempX] === game.board[y][x] && !mergedCells.find((cell) => cell.x === tempX && cell.y === y)) {
                        mergedCells.push({ x: tempX, y });
                        game.board[y][x] = 0;
                        game.score += game.board[y][tempX] * 2;
                        game.board[y][tempX] = game.board[y][tempX] * 2;
                        break;
                    } else {
                        tempX++;
                        break;
                    }
                }
                while (tempX > 0);

                if (!mergedCells.find((cell) => cell.x === tempX && cell.y === y)) {
                    const tmp = game.board[y][x];
                    game.board[y][x] = 0;
                    game.board[y][tempX] = tmp;
                }
            }
        }
    }

    moveRight(game: Game) {
        const mergedCells: Cell[] = [];

        for (let y = 0; y < this.CELL_COUNT; y++) {
            for (let x = this.CELL_COUNT - 2; x >= 0; x--) {
                if (game.board[y][x] === 0) {
                    continue;
                }

                let tempX = x;
                do {
                    tempX++;

                    if (game.board[y][tempX] === 0) {
                        continue;
                    }

                    if (game.board[y][tempX] === game.board[y][x] && !mergedCells.find((cell) => cell.x === tempX && cell.y === y)) {
                        mergedCells.push({ x: tempX, y });
                        game.board[y][x] = 0;
                        game.score += game.board[y][tempX] * 2;
                        game.board[y][tempX] = game.board[y][tempX] * 2;
                        break;
                    } else {
                        tempX--;
                        break;
                    }
                }
                while (tempX < 3);

                if (!mergedCells.find((cell) => cell.x === tempX && cell.y === y)) {
                    const tmp = game.board[y][x];
                    game.board[y][x] = 0;
                    game.board[y][tempX] = tmp;
                }
            }
        }
    }

    moveUp(game: Game) {
        const mergedCells: Cell[] = [];

        for (let y = 1; y < this.CELL_COUNT; y++) {
            for (let x = 0; x < this.CELL_COUNT; x++) {
                if (game.board[y][x] === 0) {
                    continue;
                }

                let tempY = y;
                do {
                    tempY--;

                    if (game.board[tempY][x] === 0) {
                        continue;
                    }

                    if (game.board[tempY][x] === game.board[y][x] && !mergedCells.find((cell) => cell.x === x && cell.y === tempY)) {
                        mergedCells.push({ x, y: tempY });
                        game.board[y][x] = 0;
                        game.score += game.board[tempY][x] * 2;
                        game.board[tempY][x] = game.board[tempY][x] * 2;
                        break;
                    } else {
                        tempY++;
                        break;
                    }
                }
                while (tempY > 0);

                if (!mergedCells.find((cell) => cell.x === x && cell.y === tempY)) {
                    const tmp = game.board[y][x];
                    game.board[y][x] = 0;
                    game.board[tempY][x] = tmp;
                }
            }
        }
    }

    moveDown(game: Game) {
        const mergedCells: Cell[] = [];

        for (let y = this.CELL_COUNT - 2; y >= 0; y--) {
            for (let x = 0; x < this.CELL_COUNT; x++) {
                if (game.board[y][x] === 0) {
                    continue;
                }

                let tempY = y;
                do {
                    tempY++;

                    if (game.board[tempY][x] === 0) {
                        continue;
                    }

                    if (game.board[tempY][x] === game.board[y][x] && !mergedCells.find((cell) => cell.x === x && cell.y === tempY)) {
                        mergedCells.push({ x, y: tempY });
                        game.board[y][x] = 0;
                        game.score += game.board[tempY][x] * 2;
                        game.board[tempY][x] = game.board[tempY][x] * 2;
                        break;
                    } else {
                        tempY--;
                        break;
                    }
                }
                while (tempY < 3);

                if (!mergedCells.find((cell) => cell.x === x && cell.y === tempY)) {
                    const tmp = game.board[y][x];
                    game.board[y][x] = 0;
                    game.board[tempY][x] = tmp;
                }
            }
        }
    }

    checkWin(game: Game): boolean {
        return game.board.some((row) => {
            return row.some((col) => {
                return col === 2048;
            });
        });
    }

    gameover(game: Game): boolean {
        // TODO: gameover logic
        return false;
    }

    getAvailableCells(game: Game): Cell[] {
        const cells: Cell[] = [];

        for (let y = 0; y < this.CELL_COUNT; y++) {
            for (let x = 0; x < this.CELL_COUNT; x++) {
                if (game.board[y][x] === 0) {
                    cells.push({ x, y });
                }
            }
        }

        return cells;
    }


    /////////////////////////
    /// Canvas Functions ///
    ////////////////////////

    drawCell(game: Game, x: number, y: number, num: number) {
        game.ctx.shadowColor = "transparent";
        game.ctx.shadowBlur = 0;

        const rectXPos = this.CELL_SIZE * x + this.GAP_SIZE * (x + 1);
        const rectYPos = this.CELL_SIZE * y + this.GAP_SIZE * (y + 1);

        if (num === 0) {
            game.ctx.fillStyle = "#EEE4DA59";
            roundedRect(
                game.ctx,
                rectXPos,
                rectYPos,
                this.CELL_SIZE,
                this.CELL_SIZE,
                4
            );
            return;
        }

        game.ctx.shadowColor = colorsMap[num].shadow?.color ?? "transparent";
        game.ctx.shadowBlur = colorsMap[num].shadow?.blur ?? 0;
        game.ctx.fillStyle = colorsMap[num].bgColor;
        roundedRect(
            game.ctx,
            rectXPos,
            rectYPos,
            this.CELL_SIZE,
            this.CELL_SIZE,
            4
        );

        const textXPos = this.CELL_SIZE * x + this.GAP_SIZE * (x + 1) + this.CELL_SIZE / 2;
        const textYPos = this.CELL_SIZE * y + this.GAP_SIZE * (y + 1) + this.CELL_SIZE / 2;

        game.ctx.font = `bold ${colorsMap[num].fontSize} Roboto`;
        game.ctx.fillStyle = colorsMap[num].textColor;
        game.ctx.fillText(num.toString(), textXPos, textYPos);
    }

    drawBoard(game: Game) {
        game.ctx.textAlign = "center";
        game.ctx.textBaseline = "middle";

        game.ctx.fillStyle = "#BBADA0";
        game.ctx.fillRect(0, 0, this.BOARD_WIDTH, this.BOARD_HEIGHT);

        for (let y = 0; y < this.CELL_COUNT; y++) {
            for (let x = 0; x < this.CELL_COUNT; x++) {
                this.drawCell(game, x, y, game.board[y][x]);
            }
        }
    }

    drawWinOverlay(game: Game) {
        game.ctx.fillStyle = "#00000099";
        game.ctx.fillRect(0, 0, this.BOARD_WIDTH, this.BOARD_HEIGHT);

        game.ctx.font = "bold 105px Roboto";
        game.ctx.strokeStyle = "#24D424";
        game.ctx.lineCap = "round";
        game.ctx.lineJoin = "round";
        game.ctx.lineWidth = 20;
        game.ctx.beginPath();
        game.ctx.moveTo(this.BOARD_WIDTH / 2 - 80, this.BOARD_HEIGHT / 2 - 40);
        game.ctx.lineTo(this.BOARD_WIDTH / 2 - 40, this.BOARD_HEIGHT / 2 + 20);
        game.ctx.lineTo(this.BOARD_WIDTH / 2 + 80, this.BOARD_HEIGHT / 2 - 140);
        game.ctx.stroke();

        game.ctx.fillStyle = "#E4E4E4";
        game.ctx.fillText("POGGERS", this.BOARD_WIDTH / 2, this.BOARD_HEIGHT / 2 + 130);
    }

    drawGameoverOverlay(game: Game) {
        game.ctx.fillStyle = "#00000099";
        game.ctx.fillRect(0, 0, this.BOARD_WIDTH, this.BOARD_HEIGHT);

        game.ctx.font = "bold 105px Roboto";
        game.ctx.strokeStyle = "#D42424";
        game.ctx.lineCap = "round";
        game.ctx.lineJoin = "round";
        game.ctx.lineWidth = 20;

        game.ctx.beginPath();
        game.ctx.moveTo(this.BOARD_WIDTH / 2 - 80, this.BOARD_HEIGHT / 2 - 120);
        game.ctx.lineTo(this.BOARD_WIDTH / 2 + 80, this.BOARD_HEIGHT / 2 + 40);
        game.ctx.stroke();

        game.ctx.beginPath();
        game.ctx.moveTo(this.BOARD_WIDTH / 2 + 80, this.BOARD_HEIGHT / 2 - 120);
        game.ctx.lineTo(this.BOARD_WIDTH / 2 - 80, this.BOARD_HEIGHT / 2 + 40);
        game.ctx.stroke();

        game.ctx.fillStyle = "#E4E4E4";
        game.ctx.fillText("Game Over", this.BOARD_WIDTH / 2, this.BOARD_HEIGHT / 2 + 130);
    }

    async renderBoard(game: Game, userId: string) {
        const buf = game.canvas.toBuffer("image/png");
        await fs.writeFile(path.join(os.tmpdir(), `${userId}-2048.png`), buf);
    }

    async sendBoard(int: CommandInteraction, userId: string, game: Game) {
        const owner = int.client.users.cache.get(userId);
        (game.bm?.msg as EmbedBuilder[])[0]
            .setTitle(`Score: ${bold(game.score.toString())}`)
            .setAuthor({ name: owner?.username ?? "Unknown User", iconURL: owner?.avatarURL() ?? "" })
            .setImage(`attachment://${userId}-2048.png`)
            .setColor(Number(settings.embedColors.default.toString()));

        await int.editReply({
            ...game.bm?.getReplyOpts(),
            files: [
                {
                    attachment: path.join(os.tmpdir(), `${userId}-2048.png`),
                    name: `${userId}-2048.png`,
                    description: `2048 Game for user ${userId}`,
                },
            ],
        });
    }

    ///////////////////////
    /// Other Functions ///
    ///////////////////////

    async onPress(int: ButtonInteraction, btn: ButtonBuilder, game: Game, userId: string) {
        if (int.user.id !== userId) {
            return;
        }

        game.bm?.resetTimeout();

        const validMoves: number[] = [0, 1, 2, 3];
        let win = false;
        let gameover = false;

        switch (btn.data.emoji?.id) {
        case Buttons.LEFT:
            // TODO: assign validMoves
            this.moveLeft(game);
            break;
        case Buttons.RIGHT:
            // TODO: assign validMoves
            this.moveRight(game);
            break;
        case Buttons.UP:
            // TODO: assign validMoves
            this.moveUp(game);
            break;
        case Buttons.DOWN:
            // TODO: assign validMoves
            this.moveDown(game);
            break;
        default:
            throw new Error("Invalid button pressed");
        }

        const emptyCells = this.getAvailableCells(game);
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        game.board[randomCell.y][randomCell.x] = Math.random() < 0.9 ? 2 : 4;

        game.bm?.btns.map((b, i) => validMoves.includes(i) ? b : b.setDisabled(true));
        this.drawBoard(game);

        if (this.checkWin(game)) {
            this.drawWinOverlay(game);
            win = true;
        }

        if (this.gameover(game)) {
            this.drawGameoverOverlay(game);
            gameover = true;
        }

        await this.renderBoard(game, userId);

        (game.bm?.msg as EmbedBuilder[])[0]
            .setTitle(`Score: ${bold(game.score.toString())}`);
        await int.editReply({
            ...game.bm?.getReplyOpts(),
            files: [
                {
                    attachment: path.join(os.tmpdir(), `${userId}-2048.png`),
                    name: `${userId}-2048.png`,
                    description: `2048 Game for user ${userId}`,
                },
            ],
        });

        if (win || gameover) {
            game.bm?.emit("timeout");
            game.bm?.destroy();
        }
    }

    async cleanUpGame(userId: string) {
        this.games.delete(userId);
        await fs.rm(path.join(os.tmpdir(), `${userId}-2048.png`));
    }
}
