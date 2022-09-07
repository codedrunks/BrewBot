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
import { BtnMsg, embedify, PageEmbed, useEmbedify } from "@src/utils";
import { addOrUpdateLeaderboardEntry, getLeaderboard } from "@src/database/2048";
import { DatabaseError } from "@src/database/util";
import { TwentyFortyEightLeaderboardEntry } from "@prisma/client";
import { DiscordAPIFile } from "@src/types";

interface Game {
    board: number[][];
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    bm: BtnMsg;
    score: number;
    latestInt: CommandInteraction | ButtonInteraction;
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

export enum Sort {
    Score = "score",
    GamesWon = "gamesWon"
}

export enum Order {
    Asc = "asc",
    Desc = "desc",
}

const sortChoices = [
    { name: "Score", value: Sort.Score },
    { name: "Games Won", value: Sort.GamesWon },
];

const orderByChoices = [
    { name: "Ascending", value: Order.Asc },
    { name: "Descending", value: Order.Desc },
];

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
    private readonly LEADERBOARD_WIDTH = 800;
    private readonly LEADERBOARD_ENTRY_HEIGHT = 50;
    private readonly LEADERBOARD_MAX_PAGE_ENTRIES = 20;

    private readonly games = new Map<string, Game>();
    private readonly neighbors = [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
    ];

    constructor() {
        super({
            name: "2048",
            desc: "Play a game of 2048",
            category: "games",
            subcommands: [
                {
                    name: "start",
                    desc: "Start a new game of 2048",
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
                            name: "global",
                            desc: "Whether to show server or global leaderboard. Defaults to server",
                            type: ApplicationCommandOptionType.Boolean,
                        },
                        {
                            name: "sort",
                            desc: "What to sort by. Defaults to Score",
                            type: ApplicationCommandOptionType.String,
                            choices: sortChoices.map(({ name, value }) => ({ name, value })),
                        },
                        {
                            name: "order_by",
                            desc: "Which order to order the results in. Defaults to Descending",
                            type: ApplicationCommandOptionType.String,
                            choices: orderByChoices.map(({ name, value }) => ({ name, value })),
                        }
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
        const guild = int.guild!;
        if (this.games.has(`${guild.id}_${user.id}`)) {
            return await this.editReply(int, embedify("You already have a game running! Games are unique by server"));
        }

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

        this.games.set(`${guild.id}_${user.id}`, {
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
            latestInt: int,
        });

        const game = this.games.get(`${guild.id}_${user.id}`)!;

        bm.on("press", async (b, i) => {
            await i.deferUpdate();
            this.onPress(i, b, game, user.id);
        });

        bm.on("timeout", async () => {
            bm.btns.map((btn) => btn.setDisabled(true));
            game.latestInt.editReply({ ...bm.getReplyOpts() });
            await this.cleanUpGame(guild.id, user.id);
        });

        this.generateInitialBoard(game);

        this.drawBoard(game);
        await this.renderBoard(game, guild.id, user.id);
        return await this.sendBoard(int, guild.id, user.id, game);
    }

    async leaderboard(int: CommandInteraction) {
        const guild = int.guild!;
        const global = int.options.get("global")?.value as boolean ?? false;
        const sort = int.options.get("sort")?.value as string ?? Sort.Score;
        const orderBy = int.options.get("order_by")?.value as string ?? Order.Desc;

        const entries = await getLeaderboard(guild.id, global, sort, orderBy);

        // TODO: add a button on the second row that links to the website

        if (!entries.length) {
            return await this.editReply(int, embedify(`No leaderboard entries found ${global ? "globally" : "in this server"}`));
        }

        return await this.renderAndSendLeaderboard(int, entries, global, guild.id);
    }

    async discard(int: CommandInteraction) {
        const user = int.user;
        const guild = int.guild;
        const game = this.games.get(`${guild?.id}_${user.id}`);
        if (!game) {
            return await this.editReply(int, embedify("You don't have a game running. Start one with `/2048 start`"));
        }

        game.bm?.emit("timeout");
        game.bm?.destroy();
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

        const validMoves = this.getAvailableMoves(game);
        game.bm?.btns.map((b, i) => validMoves.includes(i) ? b.setDisabled(false) : b.setDisabled(true));
    }

    getAvailableMoves(game: Game): number[] {
        const validMoves = new Set<number>();

        for (let y = 0; y < this.CELL_COUNT; y++) {
            for (let x = 0; x < this.CELL_COUNT; x++) {
                if (game.board[y][x] === 0) {
                    continue;
                }

                for (let i = 0; i < this.neighbors.length; i++) {
                    const newY = Math.min(Math.max(0, y + this.neighbors[i].y), this.CELL_COUNT - 1);
                    const newX = Math.min(Math.max(0, x + this.neighbors[i].x), this.CELL_COUNT - 1);
                    if ((newY !== y || newX !== x) && (game.board[newY][newX] === 0 || game.board[newY][newX] === game.board[y][x])) {
                        validMoves.add(i);
                    }
                }
            }
        }

        return Array.from(validMoves);
    }

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

        for (let y = 0; y < this.CELL_COUNT; y++) {
            for (let x = 0; x < this.CELL_COUNT; x++) {
                if (game.board[y][x] === 0) {
                    return false;
                }

                for (let i = 0; i < this.neighbors.length; i++) {
                    const newY = Math.min(Math.max(0, y + this.neighbors[i].y), this.CELL_COUNT - 1);
                    const newX = Math.min(Math.max(0, x + this.neighbors[i].x), this.CELL_COUNT - 1);
                    if ((newY !== y || newX !== x) && game.board[newY][newX] === game.board[y][x]) {
                        return false;
                    }
                }
            }
        }
        return true;
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

    async renderBoard(game: Game, guildId: string, userId: string) {
        const buf = game.canvas.toBuffer("image/png");
        await fs.writeFile(path.join(os.tmpdir(), `${guildId}_${userId}-2048.png`), buf);
    }

    async sendBoard(int: CommandInteraction, guildId: string, userId: string, game: Game) {
        const owner = int.client.users.cache.get(userId);
        (game.bm?.msg as EmbedBuilder[])[0]
            .setTitle(`Score: ${bold(game.score.toString())}`)
            .setAuthor({ name: owner?.username ?? "Unknown User", iconURL: owner?.avatarURL() ?? "" })
            .setImage(`attachment://${guildId}_${userId}-2048.png`)
            .setColor(settings.embedColors.default);

        await int.editReply({
            ...game.bm?.getReplyOpts(),
            files: [
                {
                    attachment: path.join(os.tmpdir(), `${guildId}_${userId}-2048.png`),
                    name: `${guildId}_${userId}-2048.png`,
                    description: `2048 Game for user ${userId} on guild ${guildId}`,
                },
            ],
        });
    }

    async renderAndSendLeaderboard(int: CommandInteraction, entries: TwentyFortyEightLeaderboardEntry[], global: boolean, guildId: string) {
        const pages = Math.floor(entries.length / this.LEADERBOARD_MAX_PAGE_ENTRIES) + 1;
        const embeds: EmbedBuilder[] = [];
        const files: DiscordAPIFile[] = [];

        for (let i = 0; i < pages; i++) {
            const players = Math.min(this.LEADERBOARD_MAX_PAGE_ENTRIES, entries.length);
            const height = (players * this.LEADERBOARD_ENTRY_HEIGHT) + this.LEADERBOARD_ENTRY_HEIGHT;
            const canvas = createCanvas(this.LEADERBOARD_WIDTH, height);
            const ctx = canvas.getContext("2d");

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillStyle = "#EEE3CB";
            ctx.fillRect(0, 0, this.LEADERBOARD_WIDTH, height);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#323232";

            ctx.moveTo(this.LEADERBOARD_WIDTH/2, 0);
            ctx.lineTo(this.LEADERBOARD_WIDTH/2, height);
            ctx.stroke();
            ctx.moveTo(this.LEADERBOARD_WIDTH/2 + this.LEADERBOARD_WIDTH/4, 0);
            ctx.lineTo(this.LEADERBOARD_WIDTH/2 + this.LEADERBOARD_WIDTH/4, height);
            ctx.stroke();
            ctx.moveTo(0, this.LEADERBOARD_ENTRY_HEIGHT);
            ctx.lineTo(this.LEADERBOARD_WIDTH, this.LEADERBOARD_ENTRY_HEIGHT);
            ctx.stroke();

            const playerXPos = this.LEADERBOARD_WIDTH/4;
            const scoreXPos = this.LEADERBOARD_WIDTH/2 + ((this.LEADERBOARD_WIDTH / 2)/4);
            const gamesWonXPos = this.LEADERBOARD_WIDTH - ((this.LEADERBOARD_WIDTH / 2)/4);

            ctx.fillStyle = "#121212";
            ctx.font = "bold 20pt Roboto";
            ctx.fillText("Player", playerXPos, this.LEADERBOARD_ENTRY_HEIGHT/2);
            ctx.fillText("Score", scoreXPos, this.LEADERBOARD_ENTRY_HEIGHT/2);
            ctx.fillText("Games Won", gamesWonXPos, this.LEADERBOARD_ENTRY_HEIGHT/2);

            for (let j = 0; j < players; j++) {
                const entry = entries[j];
                const user = int.client.users.cache.get(entry.userId);

                ctx.fillText(user?.username ?? entry.userId, playerXPos, this.LEADERBOARD_ENTRY_HEIGHT/2 + ((j + 1) * this.LEADERBOARD_ENTRY_HEIGHT));
                ctx.fillText(entry.score.toString(), scoreXPos, this.LEADERBOARD_ENTRY_HEIGHT/2 + ((j + 1) * this.LEADERBOARD_ENTRY_HEIGHT));
                ctx.fillText(entry.gamesWon.toString(), gamesWonXPos, this.LEADERBOARD_ENTRY_HEIGHT/2 + ((j + 1) * this.LEADERBOARD_ENTRY_HEIGHT));
            }

            const buf = canvas.toBuffer("image/png");
            await fs.writeFile(path.join(os.tmpdir(), `2048-leaderboard-${guildId}-${i}.png`), buf);

            const embed = new EmbedBuilder()
                .setTitle(`2048 ${global ? "Global" : "Server"} Leaderboard`)
                .setColor(settings.embedColors.default)
                .setFooter({ text: `Page ${i + 1}/${pages} - Leaderboard is limited on Discord, for the full leaderboard open the title link` })
                .setURL("https://TODO.com/leaderboard")
                .setImage(`attachment://2048-leaderboard-${guildId}-${i}.png`);

            embeds.push(embed);
            files.push({
                attachment: path.join(os.tmpdir(), `2048-leaderboard-${guildId}-${i}.png`),
                name: `2048-leaderboard-${guildId}-${i}.png`,
                description: `2048 (${global ? "global" : `guild: ${guildId}`}) Leaderboard`
            });

            entries.splice(0, players);
        }

        const pe = new PageEmbed(embeds, int.user.id, { timeout: 1000 * 60 * 10, goToPageBtn: pages > 4 }, files);

        return await pe.useInt(int);
    }

    ///////////////////////
    /// Other Functions ///
    ///////////////////////

    async onPress(int: ButtonInteraction, btn: ButtonBuilder, game: Game, userId: string) {
        if (int.user.id !== userId) {
            return;
        }

        const guildId = int.guild!.id;

        game.bm?.resetTimeout();
        game.latestInt = int;

        let win = false;
        let gameover = false;

        switch (btn.data.emoji?.id) {
        case Buttons.LEFT:
            this.moveLeft(game);
            break;
        case Buttons.RIGHT:
            this.moveRight(game);
            break;
        case Buttons.UP:
            this.moveUp(game);
            break;
        case Buttons.DOWN:
            this.moveDown(game);
            break;
        default:
            throw new Error("Invalid button pressed");
        }

        const emptyCells = this.getAvailableCells(game);
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        game.board[randomCell.y][randomCell.x] = Math.random() < 0.9 ? 2 : 4;

        const validMoves = this.getAvailableMoves(game);

        game.bm?.btns.map((b, i) => validMoves.includes(i) ? b.setDisabled(false) : b.setDisabled(true));
        this.drawBoard(game);

        if (this.checkWin(game)) {
            this.drawWinOverlay(game);
            win = true;
        }

        if (this.gameover(game)) {
            this.drawGameoverOverlay(game);
            gameover = true;
        }

        await this.renderBoard(game, guildId, userId);

        (game.bm?.msg as EmbedBuilder[])[0]
            .setTitle(`Score: ${bold(game.score.toString())}`);
        await int.editReply({
            ...game.bm?.getReplyOpts(),
            files: [
                {
                    attachment: path.join(os.tmpdir(), `${guildId}_${userId}-2048.png`),
                    name: `${guildId}_${userId}-2048.png`,
                    description: `2048 Game for user ${userId} on guild ${guildId}`,
                },
            ],
        });

        if (win || gameover) {
            const error = await addOrUpdateLeaderboardEntry(int.guild!.id, int.user.id, game.score, win);
            if (error !== DatabaseError.SUCCESS) {
                await int.followUp(useEmbedify("Failed to save score to db", settings.embedColors.error));
            }
            game.bm?.emit("timeout");
            game.bm?.destroy();
        }
    }

    async cleanUpGame(guildId: string, userId: string) {
        this.games.delete(`${guildId}_${userId}`);
        await fs.rm(path.join(os.tmpdir(), `${guildId}_${userId}-2048.png`));
    }
}
