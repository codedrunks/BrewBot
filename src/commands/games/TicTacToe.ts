import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CommandInteraction, CommandInteractionOption, EmbedBuilder } from "discord.js";
import { Command } from "@src/Command";
import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import { BtnMsg, embedify } from "@src/utils";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { settings } from "@src/settings";

interface Player {
    id: string;
    name: string;
    icon: string | undefined;
    sign: Sign;
}

interface Game {
    currentPlayer: Omit<Player, "id">;
    opponent: Player;
    board: Array<Array<Player|null>>;
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    latestInt: CommandInteraction;
    bm: BtnMsg;
}

const enum Sign {
    None = "None",
    X = "X",
    O = "O"
}

export class TicTacToe extends Command {
    private readonly CELL_SIZE = 100;
    private readonly CELL_COUNT = 3;
    private readonly PADDING = 0.2 * this.CELL_SIZE;
    private readonly BOARD_WIDTH =
        this.CELL_COUNT * this.CELL_SIZE; // 300
    private readonly BOARD_HEIGHT =
        this.CELL_COUNT * this.CELL_SIZE; // 300

    private readonly games = new Map<string, Game>();

    constructor() {
        super({
            name: "tictactoe",
            desc: "Play a game of tic tac toe",
            category: "games",
            subcommands: [
                {
                    name: "start",
                    desc: "Start a game of tic tac toe",
                    args: [
                        {
                            name: "opponent",
                            desc: "Player you want to play against (don't include to play against CPU)",
                            type: ApplicationCommandOptionType.User,
                        }
                    ],
                },
                {
                    name: "discard",
                    desc: "Discards your current game and allows you to start a new one",
                }
            ],
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void> {
        await this.deferReply(int);

        switch (opt.name) {
        case "start":
            return await this.start(int);
        case "discard":
            return await this.discard(int);
        }
    }

    /////////////////////////
    /// Command Functions ///
    /////////////////////////

    async start(int: CommandInteraction) {
        const user = int.user;
        this.games.forEach(async (game, key) => {
            if (key.includes(user.id)) {
                return await this.editReply(int, embedify("You already have a game running! Games are unique globally and not by server"));
            } else if (game.opponent.id === user.id) {
                return await this.editReply(int, embedify("You already have a game running that's initiated by someone else! Games are unique globally and not by server"));
            }
        });

        const humanOpponent = int.options.getUser("opponent");

        const opponentGoesFirst = Boolean(Math.round(Math.random()));
        const playerSign = Math.random() >= 0.5 ? Sign.X : Sign.O;

        const canvas = createCanvas(this.BOARD_WIDTH, this.BOARD_HEIGHT);
        const ctx = canvas.getContext("2d");

        const bm = new BtnMsg(
            new EmbedBuilder(),
            [
                [
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                ],
                [
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                ],
                [
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setLabel("\u200b").setStyle(ButtonStyle.Primary),
                ],
            ],
            { timeout: 1000 * 60 * 2 },
        );

        const game: Game = {
            board: [
                [null, null, null],
                [null, null, null],
                [null, null, null],
            ],
            currentPlayer: {
                name: opponentGoesFirst ? humanOpponent ? humanOpponent.username : "CPU" : int.user.username,
                icon: opponentGoesFirst ? humanOpponent ? humanOpponent.avatarURL() ?? undefined : undefined : int.user.avatarURL() ?? undefined,
                sign: opponentGoesFirst ? playerSign == Sign.X ? Sign.O : Sign.X : playerSign,
            },
            opponent: {
                id: humanOpponent ? humanOpponent.id : "CPU",
                name: humanOpponent ? humanOpponent.username : "CPU",
                icon: humanOpponent ? humanOpponent.avatarURL() ?? undefined : undefined,
                sign: playerSign == Sign.X ? Sign.O : Sign.X,
            },
            canvas: canvas,
            ctx: ctx,
            latestInt: int,
            bm: bm,
        };

        console.log(game);

        if (humanOpponent) { // le dumb human
            // TODO:
        } else { // le smart CPU
            this.games.set(user.id, game);

            this.drawBoard(game);
            await this.renderBoard(game, user.id);
            await this.sendBoard(int, game, user.id);
        }
    }

    async discard(int: CommandInteraction) {
        const user = int.user;
        const game = this.games.get(user.id);
        if (!game) {
            return await this.editReply(int, embedify("You don't have a game running (you can't discard games that aren't initiated by you). Start one with `/tictactoe start`"));
        }

        this.games.delete(user.id);
        await fs.rm(path.join(os.tmpdir(), `${user.id}-tictactoe.png`));
        return await this.editReply(int, embedify("Game discarded successfully. Start a new one with `/tictactoe start`"));
    }

    /////////////////////////////
    /// Game Logic Functions ////
    /////////////////////////////

    // TODO:

    /////////////////////////
    /// Canvas Functions ////
    /////////////////////////

    drawX(game: Game, xPos: number, yPos: number) {
        game.ctx.strokeStyle = "#79bfb6";
        game.ctx.lineWidth = 5;
        game.ctx.lineCap = "round";
        game.ctx.lineJoin = "round";
        game.ctx.shadowColor = "#79bfb6";
        game.ctx.shadowBlur = 7;

        game.ctx.beginPath();
        game.ctx.moveTo((xPos * this.CELL_SIZE) + this.PADDING, (yPos * this.CELL_SIZE) + this.PADDING);
        game.ctx.lineTo((xPos * this.CELL_SIZE) + this.CELL_SIZE - this.PADDING, (yPos * this.CELL_SIZE) + this.CELL_SIZE - this.PADDING);
        game.ctx.stroke();

        game.ctx.beginPath();
        game.ctx.moveTo((xPos * this.CELL_SIZE) + this.CELL_SIZE - this.PADDING, (yPos * this.CELL_SIZE) + this.PADDING);
        game.ctx.lineTo((xPos * this.CELL_SIZE) + this.PADDING, (yPos * this.CELL_SIZE) + this.CELL_SIZE - this.PADDING);
        game.ctx.stroke();
    }

    drawO(game: Game, xPos: number, yPos: number) {
        game.ctx.strokeStyle = "#ef928b";
        game.ctx.lineWidth = 5;
        game.ctx.shadowColor = "#ef928b";
        game.ctx.shadowBlur = 7;

        game.ctx.beginPath();
        game.ctx.arc((xPos * this.CELL_SIZE) + this.CELL_SIZE/2, (yPos * this.CELL_SIZE) + this.CELL_SIZE/2, this.CELL_SIZE/2 - this.PADDING, 0, 2 * Math.PI);
        game.ctx.stroke();
    }

    drawCell(game: Game, xPos: number, yPos: number, player: Player | null) {
        switch (player?.sign) {
        case Sign.X:
            this.drawX(game, xPos, yPos);
            break;
        case Sign.O:
            this.drawO(game, xPos, yPos);
            break;
        case Sign.None:
        default:
            break;
        }
    }

    drawBoard(game: Game) {
        game.ctx.textAlign = "center";
        game.ctx.textBaseline = "middle";

        game.ctx.fillStyle = "#EEF2E6";
        game.ctx.fillRect(0, 0, this.BOARD_WIDTH, this.BOARD_HEIGHT);
        game.ctx.lineWidth = 2;

        game.ctx.strokeStyle = "#111";
        for (let i = 100; i < this.BOARD_WIDTH; i += 100) {
            // draw column dividers
            game.ctx.beginPath();
            game.ctx.moveTo(i, 0);
            game.ctx.lineTo(i, this.BOARD_HEIGHT);
            game.ctx.stroke();

            // draw row dividers
            game.ctx.beginPath();
            game.ctx.moveTo(0, i);
            game.ctx.lineTo(this.BOARD_WIDTH, i);
            game.ctx.stroke();
        }

        for (let y = 0; y < this.CELL_COUNT; y++) {
            for (let x = 0; x < this.CELL_COUNT; x++) {
                this.drawCell(game, x, y, game.board[y][x]);
            }
        }
    }

    async renderBoard(game: Game, userId: string) {
        const buf = game.canvas.toBuffer("image/png");
        await fs.writeFile(path.join(os.tmpdir(), `${userId}-tictactoe.png`), buf);
    }

    // TODO: show whose turn it is as the embed title
    async sendBoard(int: CommandInteraction, game: Game, userId: string) {
        (game.bm?.msg as EmbedBuilder[])[0]
            .setAuthor({
                name: `${game.currentPlayer.name}'s (${game.currentPlayer.sign}) turn`,
                iconURL: game.currentPlayer.icon,
            })
            .setImage(`attachment://${userId}-tictactoe.png`)
            .setColor(settings.embedColors.default);

        await int.editReply({
            ...game.bm?.getReplyOpts(),
            files: [{
                attachment: path.join(os.tmpdir(), `${userId}-tictactoe.png`),
                name: `${userId}-tictactoe.png`,
                description: `TicTacToe Game for user ${userId}`
            }]
        });
    }
}
