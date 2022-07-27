import { CommandInteraction, CommandInteractionOption } from "discord.js";
// import { time } from "@discordjs/builders";
import { Canvas, createCanvas } from "canvas";
import fs from "fs-extra";
// import os from "os";
// import path from "path";
// import axios from "axios";
import { Command } from "../../Command";
// import { settings } from "../../settings";
// import persistentData from "../../persistentData";
// import { time } from "@discordjs/builders";
// import "lodash";
// const _ = require("lodash");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsdom = require("jsdom");
const dom = new jsdom.JSDOM("");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepClone = require("deepclonejs");
// const jquery = require("jquery")(dom.window);
// const canvas = createCanvas(200, 200);
// const ctx = canvas.getContext("2d");

let gameBoard:Board | null = null;

// PIECE CLASSES
// TODO: strict types for properties
class Piece {
    color: string;
    pos: Array<number>;
    board: Board;

    constructor(color:string, pos:Array<number>, board:Board)
    {
        this.color = color;
        this.pos = pos;
        this.board = board;
    }

    getPieceGraphic()
    {
        return "";
    }
}

class Empty extends Piece {
    constructor(color:string, pos:Array<number>, board:Board)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        return [];
    }
}

class Pawn extends Piece {
    constructor(color:string, pos:Array<number>, board:Board)
    {
        super(color, pos, board);
    }
    
    validMoves()
    {
        const deltas = this.color === "white" ? [[-1, 0], [-2, 0], [-1, -1], [-1, 1]] :
            [[1, 0], [2, 0], [1, -1], [1, 1]];

        const moveList:Array<Array<number>> = [];

        deltas.forEach((d) => {

            if((this.pos[0] + d[0] < 8 && this.pos[0] + d[0] >= 0) && (this.pos[1] + d[1] < 8 && this.pos[1] + d[1] >= 0)) {
                
                const destination = [this.pos[0] + d[0], this.pos[1] + d[1]];
                const destinationTile = this.board.tiles[destination[0]][destination[1]];

                console.log(destinationTile);
                console.log(this.color);

                // check if pawn can be moved 2 ahead
                if (d === deltas[1] &&
                destinationTile.constructor.name === "Empty" &&
                this.pos[0] === (this.color === "white" ? 6 : 1)) {
                    moveList.push(destination);
                // check if pawn can be moved 1 ahead
                } else if (d === deltas[0] &&
                destinationTile.constructor.name === "Empty") {
                    moveList.push(destination);
                // check if pawn can capture a piece
                } else if ((d === deltas[2] || d === deltas[3]) && 
                destinationTile.constructor.name !== "Empty" &&
                destinationTile.color !== this.color) {
                    moveList.push(destination);
                }
            }
        });

        return moveList;
    }

    getPieceGraphic()
    {
        return "\u{2659}";
    }
}

class Knight extends Piece {
    constructor(color:string, pos:Array<number>, board:Board)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const deltas = [[-2, 1], [-1, 2], [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1]];
        
        const moveList:Array<Array<number>> = [];

        deltas.forEach((d, i) => {

            if((this.pos[0] + d[0] < 8 && this.pos[0] + d[0] >= 0) && (this.pos[1] + d[1] < 8 && this.pos[1] + d[1] >= 0)) {

                const destination = [this.pos[0] + d[0], this.pos[1] + d[1]];
                const destinationTile = this.board.tiles[destination[0]][destination[1]];
                
                if (deltas.some((dx) => dx === deltas[i]) && 
                    (destinationTile.color !== this.color ||
                    destinationTile.constructor.name === "Empty")) {
                    const position = [this.pos[0] + d[0], this.pos[1] + d[1]];

                    moveList.push(position);
                }
            }
        });

        return moveList;
    }

    getPieceGraphic()
    {   
        return "♞";
    }
}

class Rook extends Piece {
    constructor(color:string, pos:Array<number>, board:Board)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const deltas = [[-1, 0], [0, 1], [1, 0], [0, -1]];

        const moveList:Array<Array<number>> = [];

        let i = 0;
        for(const d of deltas) {
            
            let dx = d[0];
            let dy = d[1];
            
            let count = 1;
            while((this.pos[0] + dx < 8 && this.pos[0] + dx >= 0) && (this.pos[1] + dy < 8 && this.pos[1] + dy >= 0)) {
                count++;
                
                const destination = [this.pos[0] + dx, this.pos[1] + dy];
                const destinationTile = this.board.tiles[destination[0]][destination[1]];
                
                if (deltas.some((d) => d === deltas[i]) && 
                (destinationTile.color !== this.color ||
                destinationTile.constructor.name === "Empty")) {
                                        
                    moveList.push([this.pos[0] + dx, this.pos[1] + dy]);

                    dx = d[0] * (count);
                    dy = d[1] * (count);
                } else {
                    break;
                }
            }

            i++;
        }

        return moveList;
    }

    getPieceGraphic()
    {
        return "♜";
    }
}

class Bishop extends Piece {
    constructor(color:string, pos:Array<number>, board:Board)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const deltas = [[-1, 1], [1, 1], [1, -1], [-1, -1]];

        const moveList:Array<Array<number>> = [];

        let i = 0;
        for(const d of deltas) {
            
            let dx = d[0];
            let dy = d[1];
            
            let count = 1;
            while((this.pos[0] + dx < 8 && this.pos[0] + dx >= 0) && (this.pos[1] + dy < 8 && this.pos[1] + dy >= 0)) {
                count++;
                
                const destination = [this.pos[0] + dx, this.pos[1] + dy];
                const destinationTile = this.board.tiles[destination[0]][destination[1]];
                
                if (deltas.some((d) => d === deltas[i]) && 
                (destinationTile.color !== this.color ||
                destinationTile.constructor.name === "Empty")) {
                                        
                    moveList.push([this.pos[0] + dx, this.pos[1] + dy]);

                    dx = d[0] * (count);
                    dy = d[1] * (count);
                } else {
                    break;
                }
            }

            i++;
        }

        return moveList;
    }

    getPieceGraphic()
    {
        return "♝";
    }
}

class Queen extends Piece {
    constructor(color:string, pos:Array<number>, board:Board)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const deltas = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];

        const moveList:Array<Array<number>> = [];

        let i = 0;
        for(const d of deltas) {
            
            let dx = d[0];
            let dy = d[1];
            
            let count = 1;
            while((this.pos[0] + dx < 8 && this.pos[0] + dx >= 0) && (this.pos[1] + dy < 8 && this.pos[1] + dy >= 0)) {
                count++;
                
                const destination = [this.pos[0] + dx, this.pos[1] + dy];
                const destinationTile = this.board.tiles[destination[0]][destination[1]];
                
                if (deltas.some((d) => d === deltas[i]) && 
                (destinationTile.color !== this.color ||
                destinationTile.constructor.name === "Empty")) {
                                        
                    moveList.push([this.pos[0] + dx, this.pos[1] + dy]);

                    dx = d[0] * (count);
                    dy = d[1] * (count);
                } else {
                    break;
                }
            }

            i++;
        }

        return moveList;
    }

    getPieceGraphic()
    {
        return "♛";
    }
}

class King extends Piece {
    constructor(color:string, pos:Array<number>, board:Board)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const deltas = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];

        const moveList:Array<Array<number>> = [];

        deltas.forEach((d, i) => {
            // console.log(d);
            
            if((this.pos[0] + d[0] < 8 && this.pos[0] + d[0] >= 0) && (this.pos[1] + d[1] < 8 && this.pos[1] + d[1] >= 0)) {
                
                const destination = [this.pos[0] + d[0], this.pos[1] + d[1]];
                const destinationTile = this.board.tiles[destination[0]][destination[1]];
                // console.log("trying:");
                // console.log(destination);
                // console.log("----");
                if (deltas.some((d) => d === deltas[i]) && 
                    (destinationTile.color !== this.color ||
                    destinationTile.constructor.name === "Empty")) {
                    // console.log("inside of move function");
                    moveList.push([this.pos[0] + d[0], this.pos[1] + d[1]]);
                }
            }
        });

        return moveList;
    }

    getPieceGraphic()
    {
        return "♚";
    }
}


// BOARD CLASS
class Board {   
    // grid: any;
    initialized: boolean;
    canvas: Canvas;
    tiles: Array<Array<Empty|Pawn|Knight|Rook|Bishop|Queen|King>>;
    currPlayer: string;
    prevPlayer: string;
    whiteScore: number;
    blackScore: number;
    whiteTimeBank: number;
    blackTimeBank: number;
    lastMove: Array<string>|undefined;
    embedId: string|undefined;

    constructor()
    {
        this.initialized = false;

        const layout = 
        [
            ["r", "h", "b", "q", "k", "b", "h", "r"],
            ["p", "p", "p", "p", "p", "p", "p", "p"],
            ["n", "n", "n", "n", "n", "n", "n", "n"],
            ["n", "n", "n", "b", "n", "n", "n", "n"],
            ["n", "n", "n", "n", "p", "n", "n", "n"],
            ["n", "n", "n", "n", "n", "k", "n", "n"],
            ["p", "p", "p", "p", "p", "p", "p", "p"],
            ["r", "h", "b", "q", "p", "b", "h", "r"]
        ];

        this.currPlayer = "white";
        this.prevPlayer = "";
        this.whiteScore = 0;
        this.blackScore = 0;
        this.whiteTimeBank = 1800;
        this.blackTimeBank = 1800;
        this.lastMove = undefined;
        this.embedId = "";
        this.tiles = [];

        this.canvas = createCanvas(2100, 2100);
        this.initializeTiles(layout);
        this.initializeGrid();
    }

    initializeTiles(layout:Array<string[]>)
    {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        // TODO: fill each tile with object
        this.tiles = Array(...Array(8)).map(function(a, b) 
        {
            return Array(...Array(8)).map(function (x, y) 
            {
                const color:string = b >= 4 ? "white" : "black";
                
                switch(layout[b][y]) {
                case "p":
                    return new Pawn(color, [b, y], self);
                case "h":
                    return new Knight(color, [b, y], self);
                case "r":
                    return new Rook(color, [b, y], self);
                case "b":
                    return new Bishop(color, [b, y], self);
                case "q":
                    return new Queen(color, [b, y], self);
                case "k":
                    return new King(color, [b, y], self);
                default:
                    return new Empty("", [b, y], self);
                }
            
            });});
    }

    initializeGrid()
    {
        const ctx = this.canvas.getContext("2d");

        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                
                // number label
                if (y === 0) {
                    ctx.fillStyle = "rgb(77, 51, 31)";
                    ctx.fillRect(0, (x * 250) + 100, 100, 250);
                    
                    ctx.font = "78px Impact";
                    ctx.fillStyle = "white";
                    ctx.fillStyle = "center";
                    ctx.fillText((8 - x).toString(), 28, ((x + 1) * 250));
                }

                //letter label
                if (x === 0) {
                    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
                    ctx.fillStyle = "rgb(77, 51, 31)";
                    ctx.fillRect((y * 250) + 100, 250, 100, 250);
                    
                    ctx.font = "78px Impact";
                    ctx.fillStyle = "white";
                    ctx.fillStyle = "center";
                    ctx.fillText(letters[y], (((y + 1) * 250) - 40), 80);
                }
            
                this.renderGrid();
            }
        }
    }

    renderGrid() {
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const ctx = this.canvas.getContext("2d");


                ctx.fillStyle = (x + y) % 2 == 0 ? "rgb(230, 185, 142)" : "rgb(143, 96, 50)";
                ctx.fillRect((x * 250) + 100, (y * 250) + 100, 250, 250);
                ctx.fillStyle = this.tiles[y][x].color === "white" ? "white" : "black";

                // this is what will render the pieces
                ctx.font = "156px sans-serif";
                ctx.fillText(this.tiles[y][x].getPieceGraphic(), (x * 250) + 150, (y * 250) + 275);
            }
        }
    }

    move(p1:number[], p2:number[]) {

        const movesStringified = JSON.stringify(this.tiles[p1[0]][p1[1]].validMoves());
        const currStringified = JSON.stringify([p2[0], p2[1]]);

        const currPiece = this.tiles[p1[0]][p1[1]];

        if(currPiece.color === this.currPlayer && currPiece.constructor.name !== "Empty" && 
            movesStringified.indexOf(currStringified) !== -1) {

            const temp = currPiece;
            this.tiles[p2[0]][p2[1]] = temp;
            this.tiles[p2[0]][p2[1]].pos = [p2[0], p2[1]];

            this.tiles[p1[0]][p1[1]] = new Empty(this.currPlayer, [p1[0], p1[1]], this);
            this.renderGrid();
        } else {
            throw Error("Invalid move!");
        }
    }

    checkForCheck(p1:number[], p2:number[]) {

        // const currStringified = JSON.stringify(p2);
        const currPiece = this.tiles[p1[0]][p1[1]];
        const targetPiece = this.tiles[p2[0]][p2[1]];

        if(gameBoard) {

            let temp = undefined;
            let temp2 = undefined;

            switch(currPiece.constructor.name) {
            case "Pawn": 
                temp = new Pawn(currPiece.color, p1, this);
                break;
            case "Knight":
                temp = new Knight(currPiece.color, p1, this);
                break;
            case "Rook":
                temp = new Rook(currPiece.color, p1, this);
                break;
            case "Bishop":
                temp = new Bishop(currPiece.color, p1, this);
                break;
            case "Queen":
                temp = new Queen(currPiece.color, p1, this);
                break;
            case "King":
                temp = new King(currPiece.color, p1, this);
                break;
            default:
                temp = new Empty("", p1, this);
                break;
            }

            switch(targetPiece.constructor.name) {
            case "Pawn": 
                temp2 = new Pawn(targetPiece.color, p2, this);
                break;
            case "Knight":
                temp2 = new Knight(targetPiece.color, p2, this);
                break;
            case "Rook":
                temp2 = new Rook(targetPiece.color, p2, this);
                break;
            case "Bishop":
                temp2 = new Bishop(targetPiece.color, p2, this);
                break;
            case "Queen":
                temp2 = new Queen(targetPiece.color, p2, this);
                break;
            case "King":
                temp2 = new King(targetPiece.color, p2, this);
                break;
            default:
                temp2 = new Empty("", p2, this);
                break;
            }

            this.tiles[p2[0]][p2[1]] = temp;
            this.tiles[p2[0]][p2[1]].pos = p2;
            this.tiles[p1[0]][p1[1]] = new Empty(this.currPlayer, [p1[0], p1[1]], this);
            
            const movesToBeChecked:Array<Array<Array<number>>> = [];

            let kingPos:Array<number>|undefined = undefined;

            this.tiles.flat().forEach((tile) => {
                if(tile.constructor.name === "King" && tile.color === currPiece.color) {
                    kingPos = tile.pos;
                }
            });
            
            gameBoard.tiles.flat().forEach((tile:Empty|Pawn|Knight|Rook|Bishop|Queen|King) => {
                const validMoves = tile.validMoves();
                
                if(tile.color !== this.currPlayer && tile.constructor.name !== "Empty" && validMoves.length > 0) {
                    movesToBeChecked.push(validMoves);
                }
            });

            this.tiles[p1[0]][p1[1]] = temp;
            this.tiles[p2[0]][p2[1]] = temp2;
            this.tiles[p1[0]][p1[1]].pos = p1;
            this.tiles[p2[0]][p2[1]].pos = p2;

            
            // console.log(movesToBeChecked.flat()[0]);
            // console.log(kingPos);
            if(movesToBeChecked.flat().some((move) => JSON.stringify(move) === JSON.stringify(kingPos))) {
                throw new Error("Move would leave you in check.");
            }
        }
    }
}

export class Chess extends Command
{
    constructor()
    {
        super({
            name: "chess",
            desc: "Play a game of chess with another user",
            perms: [],
            category: "fun",
            subcommands: [
                {
                    name: "start",
                    desc: "Start game",
                    args: [
                        {
                            name: "user",
                            type: "user",
                            desc: "Choose an opponent",
                        },
                    ]
                },
                {
                    name: "move",
                    desc: "Move a piece from a staring pos to end pos",
                    args: [
                        {
                            name: "p1",
                            type: "string",
                            desc: "Starting pos",
                            required: true
                        },
                        {
                            name: "p2",
                            type: "string",
                            desc: "Ending pos",
                            required: true
                        }
                    ]
                }
            ]
        });
    }
    
    async run(int: CommandInteraction, opt: CommandInteractionOption): Promise<void>
    {
        const args = opt.options;
        const { channel } = int;

        await this.deferReply(int, true);

        async function updateDescription() {
            if(gameBoard?.embedId) {
                const message = channel?.messages.fetch(gameBoard.embedId);

                if(gameBoard && message) {
                    let lastMoveStr = "";

                    if(gameBoard.lastMove) {
                        lastMoveStr = `Last move: ${gameBoard.lastMove[0]} > ${gameBoard.lastMove[1]}${gameBoard.lastMove.length === 3 ? ", capturing " + gameBoard.prevPlayer + "'s " + gameBoard.lastMove[2] : ""}
                        ───────────`;
                    }

                    const whiteFormattedMinutes = String(Math.floor(gameBoard.whiteTimeBank / 60)).padStart(2, "0");
                    const whiteFormattedSeconds = String(gameBoard.whiteTimeBank % 60).padStart(2, "0");
                    const blackFormattedMinutes = String(Math.floor(gameBoard.blackTimeBank / 60)).padStart(2, "0");
                    const blackFormattedSeconds = String(gameBoard.blackTimeBank % 60).padStart(2, "0");
                    
                    (await message).edit({embeds: [
                        {
                            description: `${gameBoard.lastMove ? lastMoveStr + `
                            `: ""}${gameBoard.currPlayer === "white" ? "**Username1 (white)**  `" + whiteFormattedMinutes + ":" + whiteFormattedSeconds + "`": "Username1 (white)  `" + whiteFormattedMinutes + ":" + whiteFormattedSeconds + "`"}
                            ${gameBoard.currPlayer === "black" ? "**Username2 (black)**  `" + blackFormattedMinutes + ":" + blackFormattedSeconds + "`" : "Username2 (black)  `" + blackFormattedMinutes + ":" + blackFormattedSeconds + "`"}`
                        }
                    ],
                    });
                }
            }
        }

        async function update() {
            const canvas = gameBoard?.canvas;

            if(canvas && gameBoard && gameBoard.currPlayer) {
                
                const buffer = canvas.toBuffer("image/png");
                
                await fs.writeFile((__dirname + "/test.png"), buffer);
                
                if(!gameBoard.initialized) {       
                    gameBoard.initialized = true;

                    setInterval(() => {
    
                        if(gameBoard && gameBoard.currPlayer === "white") {
                            gameBoard.whiteTimeBank -= 5;
                        } else if (gameBoard){
                            gameBoard.blackTimeBank -= 5;
                        }
                            
                        updateDescription();
    
                    }, 5000);

                    await channel?.send({
                        embeds: [
                            {
                                image: {
                                    url: "attachment://test.png"
                                },
                            }   
                        ],
                        files: [{
                            attachment: (__dirname + "/test.png"),
                            name: "test.png",
                            description: "A description of the file"
                        }]
                    })
                        .then((message) => {
                            if(gameBoard) {
                                gameBoard.embedId = message.id;
                                updateDescription();
                            }
                        })
                        .catch(console.error);

                } else {
                    const messageId = gameBoard.embedId;
                    if(messageId && gameBoard.lastMove) {
                        const message = channel?.messages.fetch(messageId);

                        if(message) {

                            (await message).edit({embeds: [
                                {
                                    image: {
                                        url: "attachment://test.png"
                                    }
                                }
                            ],
                            files: [{
                                attachment: (__dirname + "/test.png"),
                                name: "test.png",
                                description: "A description of the file"
                            }]
                            }).then(() => {
                                updateDescription();
                            });
                        }
                    }
                }
            }
        }

        if(opt.name === "start") {
            gameBoard = new Board();

            update();
            await int.editReply("Game Started!");
        }
        
        if (opt.name === "move" && gameBoard) {

            if (args && args.length === 2) {
                const pos1 = args[0].value;
                const pos2 = args[1].value;

                if(typeof(pos1) === "string" && typeof(pos2) === "string") {

                    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

                    const startPos = pos1.split("");

                    const x1 = letters.indexOf(startPos[0].toUpperCase());
                    const y1 = 8 - parseInt(startPos[1]);
                    
                    const endPos = pos2.split("");

                    const x2 = letters.indexOf(endPos[0].toUpperCase());
                    const y2 = 8 - parseInt(endPos[1]);

                    let status = "";
                    
                    try {
                        status = `You moved ${pos1} ${gameBoard.tiles[y1][x1].constructor.name} to ${pos2}${gameBoard.tiles[y2][x2].constructor.name !== "Empty" ? ", taking their " +  gameBoard.tiles[y2][x2].constructor.name: ""}`;

                        if (gameBoard.tiles[y2][x2].constructor.name !== "Empty") {
                            gameBoard.lastMove = [pos1, pos2, gameBoard.tiles[y2][x2].constructor.name];
                        } else {
                            gameBoard.lastMove = [pos1, pos2];
                        }

                        gameBoard.checkForCheck([y1, x1], [y2, x2]);
                        gameBoard.move([y1, x1], [y2, x2]);

                        if (gameBoard.currPlayer === "white") {
                            gameBoard.currPlayer = "black";
                            gameBoard.prevPlayer = "white";
                        } else {
                            gameBoard.currPlayer = "white";
                            gameBoard.prevPlayer = "black";
                        }


                        update();

                    } catch(err) {
                        console.log(err);
                        status = "Invalid move. Are you using the correct format? (b2, c5, h1, etc.)";
                    } finally {
                        await int.editReply({content: status});
                    }
                }
            }
        }
    }
}
