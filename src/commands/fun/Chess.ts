import { CommandInteraction, CommandInteractionOption, MessageAttachment, MessageEmbed } from "discord.js";
import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import path from "path";
import axios from "axios";
import { Command } from "../../Command";
import { settings } from "../../settings";


// const canvas = createCanvas(200, 200);
// const ctx = canvas.getContext("2d");

// ctx.font = "30px Impact";
// ctx.strokeText = "rgba(255,255,255)";
// ctx.rotate(0.1);
// ctx.fillStyle = "green";
// ctx.fillStyle = "center";
// ctx.fillText("i am text uwu", 50, 100);

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
        const moveDirs = [[]];
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
        const moveDirs = [[]];
        return null;
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
                const color = (b + y) % 2 == 0 ? "w" : "b";
                
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
                if (y == 0) {
                    ctx.fillStyle = "rgb(77, 51, 31)";
                    ctx.fillRect(0, (x * 250) + 100, 100, 250);
                    
                    ctx.font = "78px Impact";
                    ctx.fillStyle = "white";
                    ctx.fillStyle = "center";
                    ctx.fillText((x + 1).toString(), 28, ((x + 1) * 250));
                }

                //letter label
                if (x == 0) {
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
                ctx.fillStyle = "white";

                // this is what will render the pieces
                ctx.font = "156px sans-serif";
                ctx.fillText(this.tiles[y][x].getPieceGraphic(), (x * 250) + 150, (y * 250) + 275);
            }
        }
    }

    move(p1:number[], p2:number[]) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        const temp = this.tiles[p1[0]][p1[1]];
        this.tiles[p2[0]][p2[1]] = temp;
        // TODO: get color of current player for this
        this.tiles[p1[0]][p1[1]] = new Empty("w", [p1[0], p1[1]], self);
        this.renderGrid();
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

            if (args && args[0] && args[1]) {
                const pos1 = args[0].value;
                const pos2 = args[1].value;

                if(typeof(pos1) === "string" && typeof(pos2) === "string") {

                    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

                    const startPos = pos1.split("");

                    const x1 = letters.indexOf(startPos[0].toUpperCase());
                    const y1 = parseInt(startPos[1]) - 1;
                    
                    const endPos = pos2.split("");

                    const x2 = letters.indexOf(endPos[0].toUpperCase());
                    const y2 = parseInt(endPos[1]) - 1;
                    
                    
                    gameState.move([y1, x1], [y2, x2]);
                    update();
                }
            }
        }
    }
}
