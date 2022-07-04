import { CommandInteraction, CommandInteractionOption, MessageAttachment, MessageEmbed } from "discord.js";
import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import path from "path";
import axios from "axios";
import { Command } from "../../Command";
import { settings } from "../../settings";


// const canvas = createCanvas(200, 200);
// const ctx = canvas.getContext("2d");

let gameState:Board | null = null;

// PIECE CLASSES
// TODO: strict types for properties
class Piece {
    color: string;
    pos: any;
    board: any;

    constructor(color:string, pos:any, board:any)
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
    constructor(color:string, pos:any, board:any)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        // const moveDirs = [[]];
        return null;
    }

    // getPieceGraphic()
    // {
    //     return "";
    // }
}

class Pawn extends Piece {
    constructor(color:string, pos:any, board:any)
    {
        super(color, pos, board);
    }
    
    validMoves()
    {
        const deltas = this.color === "w" ? [[-1, 0], [-2, 0], [-1, -1], [-1, 1]] :
            [[0, 1], [0, 2], [-1, 1], [1, 1]];

        const moveList:Array<Array<number>> = [];

        deltas.forEach((d) => {

            const destination = [this.pos[0] + d[0], this.pos[1] + d[1]];
            const destinationTile = this.board.tiles[destination[0]][destination[1]];

            // check if pawn can be moved 2 ahead
            if (d === deltas[1] &&
            destinationTile.constructor.name === "Empty" &&
            this.pos[0] === (this.color === "w" ? 6 : 1)) {
                moveList.push(destination);
            // check if pawn can be moved 1 ahead
            } else if (d === deltas[0] &&
            destinationTile.constructor.name === "Empty") {
                moveList.push(destination);
            // check if pawn can capture a piece
            } else if ((d === deltas[2] || d === deltas[3]) && 
            destinationTile.constructor.name !== "Empty" &&
            destinationTile.color === (this.color === "w" ? "b" : "w")) {
                moveList.push(destination);
                console.log(destinationTile);
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
    constructor(color:string, pos:any, board:any)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const moveDirs = [[]];
        return null;
    }

    getPieceGraphic()
    {
        return "♞";
    }
}

class Rook extends Piece {
    constructor(color:string, pos:any, board:any)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const moveDirs = [[]];
        return null;
    }

    getPieceGraphic()
    {
        return "♜";
    }
}

class Bishop extends Piece {
    constructor(color:string, pos:any, board:any)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const moveDirs = [[]];
        return null;
    }

    getPieceGraphic()
    {
        return "♝";
    }
}

class Queen extends Piece {
    constructor(color:string, pos:any, board:any)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const moveDirs = [[]];
        return null;
    }

    getPieceGraphic()
    {
        return "♛";
    }
}

class King extends Piece {
    constructor(color:string, pos:any, board:any)
    {
        super(color, pos, board);
    }

    validMoves()
    {
        const moveDirs = [[]];
        return null;
    }

    getPieceGraphic()
    {
        return "♚";
    }
}


// BOARD CLASS
class Board {
    // grid: any;
    canvas: any;
    tiles: any;
    currPlayer: string;

    constructor()
    {
        const layout = 
        [
            ["r", "h", "b", "q", "k", "b", "h", "r"],
            ["p", "p", "p", "p", "p", "p", "p", "p"],
            ["n", "n", "n", "n", "n", "n", "n", "n"],
            ["n", "n", "n", "n", "n", "n", "n", "n"],
            ["n", "n", "n", "n", "n", "n", "n", "n"],
            ["n", "n", "n", "n", "n", "n", "n", "n"],
            ["p", "p", "p", "p", "p", "p", "p", "p"],
            ["r", "h", "b", "q", "k", "b", "h", "r"]
        ];

        this.currPlayer = "w";

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
                const color = b >= 4 ? "w" : "b";
                
                switch(layout[b][y]) {
                case "p":
                    return new Pawn(color, [b, y], self);
                    break;
                case "h":
                    return new Knight(color, [b, y], self);
                    break;
                case "r":
                    return new Rook(color, [b, y], self);
                    break;
                case "b":
                    return new Bishop(color, [b, y], self);
                    break;
                case "q":
                    return new Queen(color, [b, y], self);
                    break;
                case "k":
                    return new King(color, [b, y], self);
                    break;
                default:
                    return new Empty(color, [b, y], self);
                    break;
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
                    ctx.fillRect((y * 250) + 100, 250, 100);
                    
                    ctx.font = "78px Impact";
                    ctx.fillStyle = "white";
                    ctx.fillStyle = "center";
                    ctx.fillText(letters[y], ((y + 1) * 250), 60);
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
                ctx.fillStyle = this.tiles[y][x].color === "w" ? "white" : "black";

                // this is what will render the pieces
                ctx.font = "156px sans-serif";
                ctx.fillText(this.tiles[y][x].getPieceGraphic(), (x * 250) + 150, (y * 250) + 275);
            }
        }
    }

    move(p1:number[], p2:number[]) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        console.log([p2[0], p2[1]]);
        console.log(this.tiles[p1[0]][p1[1]].validMoves());
        console.log(this.tiles[p1[0]][p1[1]].validMoves().includes([p2[0], p2[1]]));

        const movesStringified = JSON.stringify(this.tiles[p1[0]][p1[1]].validMoves());
        const currStringified = JSON.stringify([p2[0], p2[1]]);

        if(gameState && this.tiles[p1[0]][p1[1]].constructor.name !== "Empty" && 
            movesStringified.indexOf(currStringified)) {

            const temp = this.tiles[p1[0]][p1[1]];
            this.tiles[p2[0]][p2[1]] = temp;

            this.tiles[p1[0]][p1[1]] = new Empty(gameState.currPlayer, [p1[0], p1[1]], self);
            this.renderGrid();
        } else {
            throw Error("Invalid move!");
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

        // let gameState:null | Board = null;

        function update() {
            const canvas = gameState?.canvas;
            if(canvas && gameState) {
                const imgOut = fs.createWriteStream(__dirname + "/test.jpeg");
                const stream = canvas.createJPEGStream();
                stream.pipe(imgOut);

                channel?.send({
                    embeds: [
                        {
                            image: {
                                url: "attachment://test.jpeg"
                            }
                        }
                    ],
                    files: [{
                        attachment: __dirname + "/test.jpeg",
                        name: "test.jpeg",
                        description: "A description of the file"
                    }]
                })
                    .then(console.log)
                    .catch(console.error);
            } else {
                throw(new Error("Board not initialized..."));
            }
        }

        if(opt.name === "start") {
            gameState = new Board();
            update();
        }
        
        if (opt.name === "move" && gameState) {

            if (args && args.length === 2) {
                const pos1 = args[0].value;
                const pos2 = args[1].value;

                if(typeof(pos1) === "string" && typeof(pos2) === "string") {

                    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

                    const startPos = pos1.split("");

                    const x1 = letters.indexOf(startPos[0].toUpperCase());
                    const y1 = 8 - (parseInt(startPos[1]));
                    
                    const endPos = pos2.split("");

                    const x2 = letters.indexOf(endPos[0].toUpperCase());
                    const y2 = 8 - parseInt(endPos[1]);

                    // console.log(y1);
                    // console.log(y2);

                    // console.log(gameState.tiles[y1][x1].validMoves());
                    
                    gameState.move([y1, x1], [y2, x2]);

                    if (gameState.currPlayer === "w") {
                        gameState.currPlayer = "b";
                    } else {
                        gameState.currPlayer = "w";
                    }

                    update();
                }
            }
        }
    }
}
