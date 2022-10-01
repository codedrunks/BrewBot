import { ApplicationCommandOptionType, CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { createCanvas, CanvasRenderingContext2D, Canvas } from "canvas";
import fs from "fs-extra";
import os from "os";
import { settings } from "@src/settings";
import { embedify } from "@utils/embedify";
import path from "path";

interface Game {
    board: number[][];
    userInput: number[][];
    solution: number[][];
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    emptyCells: number[][];
    filledCells: number[];
    restrictedCells: number[];
    solutions: number;
}

export class Sudoku extends Command
{
    private readonly BOARD_WIDTH = 900;
    private readonly BOARD_HEIGHT = 900;
    private readonly CELL_WIDTH = 100;
    private readonly CELL_HEIGHT = 100;
    private readonly MIN_HINTS = 40;
    private readonly BOARD_LENGTH = 9;

    private readonly games = new Map<string, Game>();

    constructor()
    {
        super({
            name: "sudoku",
            desc: "Play a game of sudoku",
            category: "games",
            subcommands: [
                {
                    name: "start",
                    desc: "Starts a new sudoku game",
                },
                {
                    name: "place",
                    desc: "Places a number on the board",
                    args: [
                        {
                            name: "box",
                            desc: "Which box you want to fill",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 9,
                            required: true,
                        },
                        {
                            name: "cell",
                            desc: "Which cell you want to fill",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 9,
                            required: true,
                        },
                        {
                            name: "number",
                            desc: "Number you want to fill in",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 9,
                            required: true,
                        }
                    ],
                },
                {
                    name: "show",
                    desc: "Shows you the current game's board",
                },
                {
                    name: "discard",
                    desc: "Discards your current game and allows you to start a new one",
                }
            ],
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        await this.deferReply(int);

        switch (opt.name) {
        case "start":
            return await this.start(int);
        case "place":
            return await this.place(int);
        case "show":
            return await this.show(int);
        case "discard":
            return await this.discard(int);
        }
    }

    async start(int: CommandInteraction) {
        const user = int.user;
        if (this.games.has(user.id)) {
            return await this.editReply(int, embedify("You already have a game running! Games are unique globally and not by server"));
        }

        const canvas = createCanvas(this.BOARD_WIDTH, this.BOARD_HEIGHT);
        const ctx = canvas.getContext("2d");

        this.games.set(user.id, {
            board: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            userInput: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            solution: [],
            emptyCells: [],
            filledCells: new Array(81).fill(null).map((_, i) => i),
            restrictedCells: [],
            solutions: 0,
            canvas: canvas,
            ctx: ctx,
        });

        const game = this.games.get(user.id)!;

        this.drawEmptyBoard(game);
        this.generateRandomBoard(game);
        this.removeNumbers(game, this.BOARD_LENGTH * this.BOARD_LENGTH);
        this.drawBoard(game);
        await this.renderBoard(game, user.id);
        return await this.sendBoard(int, user.id);
    }

    async place(int: CommandInteraction) {
        const user = int.user;

        if (!this.games.has(user.id)) {
            return await this.editReply(int, embedify("You have no game running. Start a new game with `/sudoku start`"));
        }

        const game = this.games.get(user.id)!;

        const box = int.options.get("box", true).value as number;
        const cell = int.options.get("cell", true).value as number;
        const choice = int.options.get("number", true).value as number;

        const boxRow = Math.floor((box - 1) / 3);
        const boxCol = (box - 1) % 3;
        const cellCol = (cell - 1) % 3;
        const cellRow = Math.floor((cell - 1) / 3);
        const row = boxRow * 3 + cellRow;
        const col = boxCol * 3 + cellCol;

        if (game.board[row][col] !== 0) {
            return await this.editReply(int, embedify("You cannot place a number there"));
        }
        game.userInput[row][col] = choice;

        this.drawBoard(game);
        await this.renderBoard(game, user.id);

        if (this.checkWin(game)) {
            await this.sendBoard(int, user.id);
            fs.rm(path.join(os.tmpdir(), `${user.id}-sudoku.png`));
            return this.followUpReply(int, embedify("Holy poggers you won!111!11!11"));
        }

        return await this.sendBoard(int, user.id);
    }

    async show(int: CommandInteraction) {
        const user = int.user;
        const game = this.games.get(user.id);
        if (!game) {
            return await this.editReply(int, embedify("You don't have a game running. Start one with `/sudoku start`"));
        }

        this.drawBoard(game);
        await this.renderBoard(game, user.id);
        return await this.sendBoard(int, user.id);
    }

    async discard(int: CommandInteraction) {
        const user = int.user;
        const game = this.games.get(user.id);
        if (!game) {
            return await this.editReply(int, embedify("You don't have a game running. Start one with `/sudoku start`"));
        }

        this.games.delete(user.id);
        await fs.rm(path.join(os.tmpdir(), `${user.id}-sudoku.png`));
        return await this.editReply(int, embedify("Game discarded successfully. Start a new one with `/sudoku start`"));
    }

    checkWin(game: Game): boolean {
        for (let i = 0; i < game.userInput.length; i++) {
            for (let j = 0; j < game.userInput.length; j++) {
                if (game.board[i][j] !== 0) {
                    continue;
                }

                if (game.userInput[i][j] !== game.solution[i][j]) {
                    return false;
                }
            }
        }

        return true;
    }

    solver(game: Game, emptyCells: number[][], board: number[][]): boolean {
        // backtracking algo
        // 1- create list of candidates for the current cell
        // 2- randomly choose a candidate
        // 3- let function call itself with the next cell
        // 4- if any cell has 0 valid candidates at any point in time. we revert the last cell placement and try another candidate
        // 5- recursively revert placements and run the function again until the board is filled and no cell contains a 0

        if (emptyCells.length === 0) {
            game.solutions++;
            if (game.solutions > 1) {
                return false;
            }
            return true;
        }

        const [nextRow, nextCol] = emptyCells.splice(Math.floor(Math.random() * emptyCells.length), 1)[0];
        const candidates = this.getCandidates(nextRow, nextCol, board);

        while (candidates.length) {
            const newCandidate = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
            board[nextRow][nextCol] = newCandidate;
            if (this.solver(game, emptyCells, board)) {
                return true;
            }
            board[nextRow][nextCol] = 0;
        }

        emptyCells.push([nextRow, nextCol]);

        return false;
    }

    removeNumbers(game: Game, hints: number) {
        // algo for this
        // 1- remove random number
        // 2- try solving the board
        // 3- if board not solveable, backtrack and try removing another digit
        // 4- if board is solveable, backtrack to the last number we removed that had more than one candidate and try that candidate.
        // if that candidate also results in a solution, backtrack even more and try removing another digit other that this. if not, recursively remove another number
        // 5- continue until you reach whatever number of hints you want

        while (hints > this.MIN_HINTS && game.filledCells.length) {
            game.solutions = 0;

            const randCellIdx = Math.floor(Math.random() * game.filledCells.length);
            const cell = game.filledCells.splice(randCellIdx, 1)[0];
            const removedRow = Math.floor(cell / 9);
            const removedCol = cell % 9;

            // 1- remove random number
            const removedVal = game.board[removedRow][removedCol];
            game.board[removedRow][removedCol] = 0;

            game.emptyCells.push([removedRow, removedCol]);

            const candidates = this.getCandidates(removedRow, removedCol, game.board);

            while (candidates.length) {
                candidates.splice(candidates.indexOf(removedVal), 1);
                // 2- try solving board
                this.solver(game, game.emptyCells.slice(), JSON.parse(JSON.stringify(game.board)));
                // 3- if not solveable, put the number back
                // if solveable and multiiple solutions, put number back and try somewhere else
                if (game.solutions > 1) {
                    game.board[removedRow][removedCol] = removedVal;
                    game.emptyCells.pop();
                    game.restrictedCells.push(cell);
                    break;
                }
            }

            hints = game.filledCells.length + game.restrictedCells.length;
        }
    }

    generateRandomBoard(game: Game) {
        // fill diagonal boxes 1, 5, 9
        let digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = 0; i < this.BOARD_LENGTH; i++) {
            if (i % 3 == 0) {
                digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            }

            const k = Math.floor(i / 3) * 3;
            for (let j = k; j < k + 3; j++) {
                const num = digits.splice(Math.floor(Math.random() * digits.length), 1)[0];
                game.board[i][j] = num;
            }
        }

        // fill the rest of the boxes
        this.backtracker(game.board, 0, 3);

        game.solution = JSON.parse(JSON.stringify(game.board));
    }

    backtracker(board: number[][], startRow: number, startCol: number): boolean {
        // backtracking algo
        // 1- create list of candidates for the current cell
        // 2- randomly choose a candidate
        // 3- let function call itself with the next cell
        // 4- if any cell has 0 valid candidates at any point in time. we revert the last cell placement and try another candidate
        // 5- recursively revert placements and run the function again until the board is filled and no cell contains a 0

        // if we went thru all the cols but not all the rows
        if (startCol >= 9 && startRow < 9 - 1) {
            startRow++;
            startCol = 0;
        }

        // if we went thru the entire board
        if (startRow >= 8 && startCol >= 9) {
            return true;
        }

        // if we're at diagonal box 1, 5 or 9, skip it
        if (startRow < 3) {
            if (startCol < 3) {
                startCol = 3;
            }
        } else if (startRow < 6) {
            if (startCol === (Math.floor(startRow / 3) * 3)) {
                startCol += 3;
            }
        } else {
            if (startCol === 6) {
                startRow++;
                startCol = 0;
                if (startRow >= 9) {
                    return true;
                }
            }
        }

        const candidates = this.getCandidates(startRow, startCol, board);

        // try every candidate until we find one that uniquely solves the board.
        while (candidates.length) {
            const candidate = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
            board[startRow][startCol] = candidate;
            if (this.backtracker(board, startRow, startCol + 1)) {
                return true;
            }
            board[startRow][startCol] = 0;
        }

        // if no candidates, we backtrack and try something else.
        return false;
    }

    getCandidates(row: number, col: number, board: number[][]): number[] {
        const clashingDigits = new Set<number>();
        const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        // check row
        for (let k = 0; k < board.length; k++) {
            if (board[row][k] !== 0) {
                clashingDigits.add(board[row][k]);
            }
        }

        // check col
        for (let k = 0; k < board.length; k++) {
            if (board[k][col] !== 0) {
                clashingDigits.add(board[k][col]);
            }
        }

        // check box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let k = boxRow; k < boxRow + 3; k++) {
            for (let p = boxCol; p < boxCol + 3; p++) {
                if (board[k][p] !== 0) {
                    clashingDigits.add(board[k][p]);
                }
            }
        }

        return digits.filter(digit => !Array.from(clashingDigits).includes(digit));
    }

    /////////////////////////
    /// Drawing Functions ///
    ////////////////////////

    drawEmptyBoard(game: Game) {
        game.ctx.fillStyle = "#F0EBE3";
        game.ctx.fillRect(0, 0, this.BOARD_WIDTH, this.BOARD_HEIGHT);

        game.ctx.strokeStyle = "#2C3639";
        // draw the column dividers
        for (let i = 100; i < this.BOARD_WIDTH; i+= 100) {
            game.ctx.beginPath();
            if (i % 300 == 0) {
                game.ctx.lineWidth = 5;
            } else {
                game.ctx.lineWidth = 1;
            }
            game.ctx.moveTo(i, 0);
            game.ctx.lineTo(i, this.BOARD_HEIGHT);
            game.ctx.stroke();
        }

        // draw the row dividers
        for (let i = 100; i < this.BOARD_HEIGHT; i+= 100) {
            game.ctx.beginPath();
            if (i % 300 == 0) {
                game.ctx.lineWidth = 5;
            } else {
                game.ctx.lineWidth = 1;
            }
            game.ctx.moveTo(0, i);
            game.ctx.lineTo(this.BOARD_WIDTH, i);
            game.ctx.stroke();
        }
    }

    drawNumber(game: Game, xPos: number, yPos: number, choice: number) {
        game.ctx.font = "bold 46pt Roboto";
        game.ctx.textAlign = "center";
        game.ctx.textBaseline = "middle";

        xPos = xPos + this.CELL_WIDTH / 2;
        yPos = yPos + this.CELL_HEIGHT / 2;

        game.ctx.fillText(choice.toString(), xPos, yPos);
    }

    drawBoard(game: Game) {
        for (let row = 0; row < this.BOARD_LENGTH; row++) {
            for (let col = 0; col < this.BOARD_LENGTH; col++) {
                const boxRow = Math.floor(row / 3);
                const boxCol = Math.floor(col / 3);
                const cellRow = row - (boxRow * 3);
                const cellCol = col - (boxCol * 3);

                const xPos = (boxCol * 300) + (cellCol * 100);
                const yPos = (boxRow * 300) + (cellRow * 100);

                if (game.board[row][col] != 0) {
                    game.ctx.fillStyle = "#2C3639";
                    this.drawNumber(game, xPos, yPos, game.board[row][col]);
                }

                if (game.userInput[row][col] != 0) {
                    game.ctx.fillStyle = "#F0EBE3";
                    // we don't fully fill the rect because that wipes away some pixels of the dividing lines
                    game.ctx.fillRect(xPos + 5, yPos + 5, this.CELL_WIDTH - 10, this.CELL_HEIGHT - 10);
                    game.ctx.fillStyle = "#6E85B7";
                    this.drawNumber(game, xPos, yPos, game.userInput[row][col]);
                }
            }
        }
    }

    async renderBoard(game: Game, userId: string) {
        const buf = game.canvas.toBuffer("image/png");
        await fs.writeFile(path.join(os.tmpdir(), `${userId}-sudoku.png`), buf);
    }

    async sendBoard(int: CommandInteraction, userId: string) {
        await int.editReply({
            embeds: [
                {
                    image: {
                        url: `attachment://${userId}-sudoku.png`
                    },
                    color: Number(settings.embedColors.default.toString()),
                }
            ],
            files: [{
                attachment: path.join(os.tmpdir(), `${userId}-sudoku.png`),
                name: `${userId}-sudoku.png`,
                description: "Literally a sudoku"
            }]
        });
    }
}
