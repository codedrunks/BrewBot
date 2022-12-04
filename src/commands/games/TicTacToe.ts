import { APIButtonComponentWithCustomId, ApplicationCommandOptionType, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, CommandInteractionOption, EmbedBuilder, MessageReaction, User } from "discord.js";
import { Command } from "@src/Command";
import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import { BtnMsg, embedify } from "@src/utils";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { settings } from "@src/settings";
import { randomItem } from "svcorelib";

interface Player {
    id: string;
    name: string;
    icon: string | undefined;
    sign: Sign;
}

interface Game {
    currentPlayer: Player;
    opponent: Player;
    board: Array<Array<Player|null>>;
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    bm: BtnMsg;
}

interface Move {
    row: number;
    idx: number;
}

const enum Sign {
    None = "1030120536996593681",
    X = "1030102333591408660",
    O = "1030102291644153877"
}

const enum GameoverState {
    Win = 0,
    Tie,
    None
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
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                ],
                [
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                ],
                [
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setEmoji(Sign.None).setStyle(ButtonStyle.Primary),
                ],
            ],
            { timeout: 1000 * 60 * 2 },
        );

        bm.on("timeout", async () => {
            bm.btns.flat().map((btn) => btn.setDisabled(true));
            int.editReply({
                ...bm.getReplyOpts(),
                files: [
                    {
                        attachment: path.join(os.tmpdir(), `${user.id}-tictactoe.png`),
                        name: `${user.id}-tictactoe.png`,
                        description: `TicTacToe Game for user ${user.id}`,
                    },
                ],
            });
            await this.cleanUpGame(user.id);
        });

        bm.on("press", async (b, i) => {
            await i.deferUpdate();
            this.onPress(i, b, game, user);
        });

        const game: Game = {
            board: [
                [null, null, null],
                [null, null, null],
                [null, null, null],
            ],
            currentPlayer: {
                id: opponentGoesFirst ? humanOpponent ? humanOpponent.id : "CPU" : int.user.id,
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
            bm: bm,
        };

        if (humanOpponent) { // le dumb human
            await int.channel?.send({
                content: `${int.user} has challenged ${humanOpponent} to a game of tic tac toe.`
            })
                .then((message) => {
                    const filter = (_: MessageReaction, user: User) => user.id === humanOpponent.id;

                    message.react("✅");
                    message.react("❌");

                    message.awaitReactions({filter, max: 1, time: 60000}).then((collected) => {
                        collected.forEach(async (reaction) => {
                            message.delete();

                            if(reaction.emoji.name === "✅") {
                                this.games.set(user.id, game);

                                this.drawBoard(game);
                                await this.renderBoard(game, user.id);
                                await this.sendBoard(int, game, user.id);
                            } else {
                                return await this.editReply(int, embedify(`${humanOpponent.username} has rejected your challenge`));
                            }
                        });
                    });
                })
                .catch((err) => console.error("/tictactoe error:", err));
        } else { // le smart CPU
            this.games.set(user.id, game);

            this.drawBoard(game);
            await this.renderBoard(game, user.id);
            await this.sendBoard(int, game, user.id);

            if (opponentGoesFirst) {
                this.cpuPlay(game, int, int.user);
            }
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

    getValidMoves(game: Game): Move[] {
        const moves: Move[] = [];

        game.board.forEach((row, rowNum) => {
            return row.map((player, idx) => {
                if (!player) {
                    moves.push(<Move>{ row: rowNum, idx });
                }
            });
        });

        return moves;
    }

    checkGameover(board: (Player | null)[]): GameoverState {
        const grid = Math.sqrt(board.length);

        // check rows
        rows:
        for (let i = 0; i < grid; i++) {
            for (let j = 0; j < grid; j++) {
                if (!board[i * grid]) {
                    continue rows;
                }
                if (board[i * grid]?.sign !== board[i * grid + j]?.sign) {
                    continue rows;
                }
            }

            return GameoverState.Win;
        }

        // check columns
        cols:
        for (let i = 0; i < grid; i++) {
            for (let j = 0; j < grid; j++) {
                if (!board[i]) {
                    continue cols;
                }
                if (board[i]?.sign !== board[j * grid + i]?.sign) {
                    continue cols;
                }
            }

            return GameoverState.Win;
        }

        //check diagonals
        let diagWin = 0;
        let reverseDiagWin = 0;

        for (let i = 0; i < grid; i++) {
            if (board[0] && board[i * grid + i] && board[0]?.sign === board[i * grid + i]?.sign) {
                diagWin++;
            }

            if (board[grid - 1] && board[i * (grid - 1) + (grid - 1)] && board[grid - 1]?.sign === board[i * (grid - 1) + (grid - 1)]?.sign) {
                reverseDiagWin++;
            }
        }

        if (diagWin === grid || reverseDiagWin === grid) {
            return GameoverState.Win;
        }

        if (board.every((player) => player)) {
            return GameoverState.Tie;
        }

        return GameoverState.None;
    }

    cpuPlay(game: Game, int: ButtonInteraction | CommandInteraction, initiator: User) {
        setTimeout(async () => {
            const validMoves = this.getValidMoves(game);
            // TODO: maybe write an algo to actually solve the game instead of random moves
            const randomMove = randomItem(validMoves);
            const { row, idx } = randomMove;

            game.bm.btns.flat().map((btn, i) => i === (row * 3 + idx) ? btn.setDisabled(true).setEmoji(game.currentPlayer.sign) : btn);
            game.board[row][idx] = game.opponent;

            game.currentPlayer = {
                id: initiator.id,
                name: initiator.username,
                icon: initiator.avatarURL() ?? undefined,
                sign: game.opponent.sign == Sign.X ? Sign.O : Sign.X,
            };

            const gameover = this.checkGameover(game.board.flat());

            this.drawBoard(game);
            await this.renderBoard(game, initiator.id);

            switch (gameover) {
            case GameoverState.Win:
                (game.bm?.msg as EmbedBuilder[])[0]
                    .setAuthor({
                        name: "The CPU won",
                        iconURL: undefined,
                    }).setColor(settings.embedColors.success);
                game.bm.emit("timeout");
                game.bm.destroy();
                break;
            case GameoverState.Tie:
                (game.bm?.msg as EmbedBuilder[])[0]
                    .setAuthor({
                        name: "It's a tie",
                        iconURL: undefined,
                    }).setColor(settings.embedColors.gameLost);
                game.bm.emit("timeout");
                game.bm.destroy();
                break;
            case GameoverState.None:
            default:
                await this.nextTurn(game, int, initiator.id);
                break;
            }
        }, 2500);
    }

    /////////////////////////
    /// Canvas Functions ////
    /////////////////////////

    drawX(game: Game, xPos: number, yPos: number) {
        game.ctx.strokeStyle = "#ef928b";
        game.ctx.lineWidth = 5;
        game.ctx.lineCap = "round";
        game.ctx.lineJoin = "round";
        game.ctx.shadowColor = "#ef928b";
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
        game.ctx.strokeStyle = "#79bfb6";
        game.ctx.lineWidth = 5;
        game.ctx.shadowColor = "#79bfb6";
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

    async sendBoard(int: CommandInteraction, game: Game, userId: string) {
        (game.bm?.msg as EmbedBuilder[])[0]
            .setAuthor({
                name: `${game.currentPlayer.name}'s (${game.currentPlayer.sign === Sign.X ? "X" : "O"}) turn`,
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

    ////////////////////////
    /// Other Functions ////
    ////////////////////////

    async nextTurn(game: Game, int: ButtonInteraction | CommandInteraction, initiatorId: string) {
        (game.bm?.msg as EmbedBuilder[])[0]
            .setAuthor({
                name: `${game.currentPlayer.name}'s (${game.currentPlayer.sign === Sign.X ? "X" : "O"}) turn`,
                iconURL: game.currentPlayer.icon,
            });
        await int.editReply({
            ...game.bm?.getReplyOpts(),
            files: [
                {
                    attachment: path.join(os.tmpdir(), `${initiatorId}-tictactoe.png`),
                    name: `${initiatorId}-tictactoe.png`,
                    description: `TicTacToe Game for user ${initiatorId}`,
                },
            ],
        });
    }

    async onPress(int: ButtonInteraction, btn: ButtonBuilder, game: Game, initiator: User) {
        if (game.currentPlayer.id !== int.user.id) {
            return;
        }

        const btnId = (btn.data as APIButtonComponentWithCustomId).custom_id.split("@")[1].split("_");
        const row = Number(btnId[0]);
        const idx = Number(btnId[1]);

        game.bm.btns.flat().map((btn, i) => i === (row * 3 + idx) ? btn.setDisabled(true).setEmoji(game.currentPlayer.sign) : btn);
        game.board[row][idx] = game.currentPlayer;

        game.currentPlayer = game.currentPlayer.id === game.opponent.id ? {
            id: initiator.id,
            name: initiator.username,
            icon: initiator.avatarURL() ?? undefined,
            sign: game.opponent.sign == Sign.X ? Sign.O : Sign.X,
        } : game.opponent;

        const gameover = this.checkGameover(game.board.flat());

        this.drawBoard(game);
        await this.renderBoard(game, initiator.id);

        switch (gameover) {
        case GameoverState.Win:
            (game.bm?.msg as EmbedBuilder[])[0]
                .setAuthor({
                    name: `${int.user.username} won`,
                    iconURL: int.user.avatarURL() ?? undefined,
                }).setColor(settings.embedColors.success);
            game.bm.emit("timeout");
            game.bm.destroy();
            break;
        case GameoverState.Tie:
            (game.bm?.msg as EmbedBuilder[])[0]
                .setAuthor({
                    name: "It's a tie",
                    iconURL: undefined,
                }).setColor(settings.embedColors.gameLost);
            game.bm.emit("timeout");
            game.bm.destroy();
            break;
        case GameoverState.None:
        default:
            await this.nextTurn(game, int, initiator.id);
            game.opponent.id === "CPU" && this.cpuPlay(game, int, int.user);
        }
    }

    async cleanUpGame(userId: string) {
        this.games.delete(`${userId}`);
        await fs.rm(path.join(os.tmpdir(), `${userId}-tictactoe.png`));
    }
}
