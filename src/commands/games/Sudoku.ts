import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { createCanvas, CanvasRenderingContext2D, Canvas } from "canvas";
import fs from "fs";
import os from "os";
import { settings } from "@src/settings";

export class Sudoku extends Command
{
    private readonly BOARD_WIDTH = 900;
    private readonly BOARD_HEIGHT = 900;
    private readonly CELL_WIDTH = 100;
    private readonly CELL_HEIGHT = 100;
    private readonly canvas: Canvas;
    private readonly ctx: CanvasRenderingContext2D;
    private board: number[][] = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    constructor()
    {
        super({
            name: "sudoku",
            desc: "Play a game of sudoku",
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
                            type: "number",
                            min: 1,
                            max: 9,
                            required: true,
                        },
                        {
                            name: "cell",
                            desc: "Which cell you want to fill",
                            type: "number",
                            min: 1,
                            max: 9,
                            required: true,
                        },
                        {
                            name: "number",
                            desc: "Number you want to fill in",
                            type: "number",
                            min: 1,
                            max: 9,
                            required: true,
                        }
                    ],
                }
            ],
        });

        const canvas = createCanvas(this.BOARD_WIDTH, this.BOARD_HEIGHT);
        const ctx = canvas.getContext("2d");
        this.ctx = ctx;
        this.canvas = canvas;
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        this.drawEmptyBoard();

        switch (opt.name) {
        case "start":
            return await this.start(int);
        case "place":
            return await this.place(int);
        }
    }

    async start(int: CommandInteraction) {
        // TODO: check if game is already started by this user
        this.resetBoard();
        this.generateRandomBoard();
        this.removeNumbers();
        this.drawBoard();
        this.renderBoard();
        return await this.sendBoard(int);
    }

    removeNumbers() {
        // TODO: implement this
    }

    resetBoard() {
        this.board = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ];
    }

    async place(int: CommandInteraction) {
        // TODO: check if there's no game running
        const box = int.options.getNumber("box", true);
        const cell = int.options.getNumber("cell", true);
        const choice = int.options.getNumber("number", true);
        this.placeNumber(box, cell, choice);
        this.drawBoard();
        this.renderBoard();
        // TODO: check if all cells have been filled and then check win condition
        return await this.sendBoard(int);
    }

    placeNumber(box: number, cell: number, choice: number) {
        const boxRow = Math.floor((box - 1) / 3);
        const boxCol = (box - 1) % 3;
        const cellCol = (cell - 1) % 3;
        const cellRow = Math.floor((cell - 1) / 3);
        const row = boxRow * 3 + cellRow;
        const col = boxCol * 3 + cellCol;

        this.board[row][col] = choice;
    }

    drawNumber(box: number, cell: number, choice: number) {
        this.ctx.font = "bold 40pt Roboco";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "#2C3639";

        const boxCol = (box - 1) % 3;
        const boxRow = Math.floor((box - 1) / 3);

        const cellCol = (cell - 1) % 3;
        const cellRow = Math.floor((cell - 1) / 3);

        const xPos = (boxCol * 300) + (cellCol * 100) + this.CELL_WIDTH / 2;
        const yPos = (boxRow * 300) + (cellRow * 100) + this.CELL_HEIGHT / 2;
        this.ctx.fillText(choice.toString(), xPos, yPos);
    }

    drawEmptyBoard() {
        this.ctx.fillStyle = "#F0EBE3";
        this.ctx.fillRect(0, 0, this.BOARD_WIDTH, this.BOARD_HEIGHT);

        this.ctx.strokeStyle = "#2C3639";
        // draw the column dividers
        for (let i = 100; i < this.BOARD_WIDTH; i+= 100) {
            this.ctx.beginPath();
            if (i % 300 == 0) {
                this.ctx.lineWidth = 5;
            } else {
                this.ctx.lineWidth = 1;
            }
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.BOARD_HEIGHT);
            this.ctx.stroke();
        }

        // draw the row dividers
        for (let i = 100; i < this.BOARD_HEIGHT; i+= 100) {
            this.ctx.beginPath();
            if (i % 300 == 0) {
                this.ctx.lineWidth = 5;
            } else {
                this.ctx.lineWidth = 1;
            }
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.BOARD_WIDTH, i);
            this.ctx.stroke();
        }
    }

    generateRandomBoard() {
        // fill diagonal boxes 1, 5, 9
        let digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = 0; i < this.board.length; i++) {
            if (i % 3 == 0) {
                digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            }

            const k = Math.floor(i / 3) * 3;
            for (let j = k; j < k + 3; j++) {
                const num = digits.splice(Math.floor(Math.random() * digits.length), 1)[0];
                this.board[i][j] = num;
            }
        }

        // fill the rest of the boxes
        this.backtracker(0, 3);
    }

    backtracker(startRow: number, startCol: number): boolean {
        // backtracking algo
        // 1- create list of candidates for the current cell
        // 2- randomly choose a candidate
        // 3- let function call itself with the next cell
        // 4- if any cell has 0 valid candidates at any point in time. we revert the last cell placement and try another candidate
        // 5- recursively revert placements and run the function again until the board is filled and no cell contains a 0

        if (startCol >= 9 && startRow < 9 - 1) {
            startRow++;
            startCol = 0;
        }
        if (startRow >= 9 && startCol >= 9) {
            return true;
        }

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

        const candidates = this.getCandidates(startRow, startCol);

        while (candidates.length) {
            const candidate = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
            this.board[startRow][startCol] = candidate;
            if (this.backtracker(startRow, startCol + 1)) {
                return true;
            }
            this.board[startRow][startCol] = 0;
        }

        return false;
    }

    getCandidates(row: number, col: number): number[] {
        const clashingDigits = new Set<number>();
        const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        // check row
        for (let k = 0; k < this.board.length; k++) {
            if (this.board[row][k] !== 0) {
                clashingDigits.add(this.board[row][k]);
            }
        }

        // check col
        for (let k = 0; k < this.board.length; k++) {
            if (this.board[k][col] !== 0) {
                clashingDigits.add(this.board[k][col]);
            }
        }

        // check box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let k = boxRow; k < boxRow + 3; k++) {
            for (let p = boxCol; p < boxCol + 3; p++) {
                if (this.board[k][p] !== 0) {
                    clashingDigits.add(this.board[k][p]);
                }
            }
        }

        return digits.filter(digit => !Array.from(clashingDigits).includes(digit));
    }

    drawBoard() {
        for (let row = 0; row < this.board.length; row++) {
            for (let col = 0; col < this.board[row].length; col++) {
                if (this.board[row][col] != 0) {
                    const boxRow = Math.floor(row / 3);
                    const boxCol = Math.floor(col / 3);
                    const box = (boxRow * 3 + boxCol) + 1;
                    const cellRow = row - (boxRow * 3);
                    const cellCol = col - (boxCol * 3);
                    const cell = (cellRow * 3 + cellCol) + 1;
                    this.drawNumber(box, cell, this.board[row][col]);
                }
            }
        }
    }

    // TODO: rename test.png to sudoku.png or maybe even just a random uuid
    renderBoard() {
        const buf = this.canvas.toBuffer("image/png");
        fs.writeFileSync(os.tmpdir() + "/test.png", buf);
    }

    async sendBoard(int: CommandInteraction) {
        await int.reply({
            embeds: [
                {
                    image: {
                        url: "attachment://test.png"
                    },
                    color: settings.embedColors.default,
                }
            ],
            files: [{
                attachment: os.tmpdir() + "/test.png",
                name: "test.png",
                description: "A description of the file"
            }]
        });
    }
}
