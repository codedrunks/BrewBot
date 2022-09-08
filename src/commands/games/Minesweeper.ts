import { ApplicationCommandOptionType, Client, Collection, CommandInteraction, CommandInteractionOption, EmbedBuilder } from "discord.js";
import { Canvas, CanvasRenderingContext2D } from "canvas";
import { Command } from "@src/Command";
import { embedify } from "@src/utils";
import { settings } from "@src/settings";
import { randRange } from "svcorelib";

//#SECTION types

/** User-friendly coordinates of a cell */
type CellCoords = [string, number];

type CellObj = {
    revealed: boolean;
} & ({
    type: "blank";
} | {
    type: "number";
    value: number;
} | {
    type: "mine";
} | {
    type: "flag";
    /** The previous type of this flag cell */
    prev: "blank" | "number" | "mine";
});

type BoardSize = "15x25" | "20x40" | "25x55" | "25x70";


interface BoardOptions {
    size: BoardSize;
    canvasSize: [width: number, height: number];
    cellSize: [width: number, height: number];
    paddingTop: number;
    paddingLeft: number;
    mines: number;
}

interface GameObj {
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    state: "running" | "exploded" | "cleared";
    userId: string;
    guildId: string;
    channelId: string;
    board: CellObj[][];
    boardOpts: BoardOptions;
}

export class Minesweeper extends Command
{
    /** Mapping of column letters and their index */
    readonly COLUMN_INDEX_MAP = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y"];

    readonly BOARD_OPTIONS: BoardOptions[] = [
        {
            size: "15x25",
            canvasSize: [775, 1125],
            cellSize: [45, 45],
            paddingTop: 100,
            paddingLeft: 100,
            mines: 10,
        },
        {
            size: "20x40",
            canvasSize: [600, 1200],
            cellSize: [30, 30],
            paddingTop: 100,
            paddingLeft: 100,
            mines: 10,
        },
        {
            size: "25x55",
            canvasSize: [625, 1375],
            cellSize: [25, 25],
            paddingTop: 100,
            paddingLeft: 100,
            mines: 10,
        },
        {
            size: "20x40",
            canvasSize: [600, 1200],
            cellSize: [30, 30],
            paddingTop: 100,
            paddingLeft: 100,
            mines: 10,
        },
    ];

    readonly client;

    private games = new Collection<string, GameObj>();

    //#SECTION constructor
    constructor(client: Client)
    {
        super({
            name: "minesweeper",
            desc: "Play a game of minesweeper",
            category: "games",
            subcommands: [
                {
                    name: "play",
                    desc: "Starts a new game of minesweeper",
                    args: [
                        {
                            name: "size",
                            desc: "How big the playing field should be (width x height)",
                            type: ApplicationCommandOptionType.String,
                            choices: [
                                { name: "15 x 25 (tiny)", value: "15x25" },
                                { name: "20 x 40 (small)", value: "20x40" },
                                { name: "25 x 55 (normal)", value: "25x55" },
                                { name: "25 x 70 (large)", value: "25x70" },
                            ],
                            required: true,
                        },
                    ],
                },
                {
                    name: "flag",
                    desc: "Places a flag on the specified cell",
                    args: [
                        {
                            name: "cell",
                            desc: "Enter the cell in the format <letter><number>, for example: c12",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: "sweep",
                    desc: "Reveals the specified cell, which shows the number of mine neighbors, or explodes the mine",
                    args: [
                        {
                            name: "cell",
                            desc: "Enter the cell in the format <letter><number>, for example: c12",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: "discard",
                    desc: "Discards your currently active game",
                },
            ],
        });

        this.client = client;
    }

    //#SECTION entry point

    async run(int: CommandInteraction, opt: CommandInteractionOption): Promise<void>
    {
        if(!int.guild || !int.channel)
            return this.reply(int, embedify("Please use this command in a guild", settings.embedColors.error), true);

        await this.deferReply(int);

        const wrongCellFormat = (int: CommandInteraction) =>
            this.editReply(int, embedify("Please enter a cell in the format `<letter><number>`", settings.embedColors.error));

        const getCell = (): CellCoords | undefined => {
            const raw = (int.options.get("cell", true).value as string).trim().toLowerCase();

            const letterFirst = raw.match(/^\w\d+$/),
                numberFirst = raw.match(/^\d+\w$/);

            let result, letter, num = NaN;
            if(letterFirst)
            {
                result = /^(\w)(\d+)$/.exec(raw);
                letter = result?.[0];
                num = parseInt(result?.[1] ?? "_");
            }
            else if(numberFirst)
            {
                result = /^(\w)(\d+)$/.exec(raw);
                letter = result?.[1];
                num = parseInt(result?.[0] ?? "_");
            }

            if(!result || !letter || isNaN(num))
                return;

            return [letter, num];
        };

        switch(opt.name)
        {
        case "play":
            return this.createNewGame(int);
        case "discard":
            return this.discardGame(int);
        case "flag":
        {
            const cell = getCell();
            if(!cell)
                return wrongCellFormat(int);

            return this.setFlag(int, cell);
        }
        case "sweep":
        {
            const cell = getCell();
            if(!cell)
                return wrongCellFormat(int);

            return this.setRevealed(int, cell);
        }
        }
    }

    //#MARKER discord message stuff

    /**
     * Starts the game
     * @param int Already deferred interaction
     */
    startGame(int: CommandInteraction, game: GameObj)
    {
        void [int, game];
    }

    /**
     * Returns the default embed of the game
     * @param img TODO: the rendered image
     */
    getGameEmbed(game: GameObj, img?: string)
    {
        const guild = this.client.guilds.cache.find(g => g.id === game.guildId);
        const member = guild?.members.cache.find(m => m.id === game.userId);

        const ebd = new EmbedBuilder()
            .setTitle("Minesweeper")
            .setColor(settings.embedColors.default);

        member && ebd.setAuthor({
            name: member.nickname ?? member.user.username,
            iconURL: member.avatarURL() ?? member.displayAvatarURL(),
        });

        img && ebd.setImage(img);

        return ebd;
    }

    //#MARKER game

    //#SECTION game management
    /** Creates a new game */
    createNewGame(int: CommandInteraction)
    {
        const userId = int.user.id;
        const guildId = int.guild!.id;
        const channelId = int.channel!.id;

        const size = int.options.get("size", true).value as BoardSize;

        const boardSettings = this.BOARD_OPTIONS.find(bs => bs.size === size)!;

        const canvas = new Canvas(boardSettings.canvasSize[0], boardSettings.canvasSize[1], "image");

        const game: GameObj = {
            canvas,
            ctx: canvas.getContext("2d"),
            state: "running",
            userId,
            guildId,
            channelId,
            boardOpts: boardSettings,
            board: this.createNewBoard(size),
        };

        this.games.set(`${guildId}-${userId}`, game);

        this.startGame(int, game);
    }

    /** Creates a new randomized minesweeper board */
    createNewBoard(size: BoardSize): CellObj[][]
    {
        const [w, h] = size.split("x").map(v => parseInt(v));

        const board: CellObj[][] = [];

        for(let y = 0; y < h; y++)
        {
            board.push([]);

            for(let x = 0; x < w; x++)
                board[y].push({ type: "blank", revealed: false });
        }

        let maxTries = 10000;
        let minesToPlace = 10;

        while(minesToPlace > 0)
        {
            if(maxTries === 0) // prevent infinite loop should some mine calculation or something mess up
                break;

            const randX = randRange(0, w);
            const randY = randRange(0, h);

            if(board[randY][randX].type !== "mine")
            {
                board[randY][randX].type = "mine";
                minesToPlace--;
            }
            maxTries--;
        }

        for(let y = 0; y < h; y++)
        {
            for(let x = 0; x < w; x++)
            {
                const cell = board[y][x];

                if(cell.type === "blank")
                {
                    // TODO: check how many neighbors are mines, then convert to type: "number"
                    const neighborMines = 4;

                    // leave cell "blank" if it has no mine neighbors
                    if(neighborMines > 0)
                    {
                        board[y][x] = {
                            type: "number",
                            value: neighborMines,
                            revealed: cell.revealed,
                        };
                    }
                }
            }
        }

        return board;
    }
    
    /** Discards an active game */
    discardGame(int: CommandInteraction)
    {
        const userId = int.user.id;
        const guildId = int.guild!.id;
        void [userId, guildId];
    }

    //#SECTION set flag
    /** Sets a flag */
    setFlag(int: CommandInteraction, cell: CellCoords)
    {
        void [int, cell];
    }

    //#SECTION set revealed
    /** Sets a field to be revealed, possibly blowing up a mine or cascading the reveal to neighbor cells */
    setRevealed(int: CommandInteraction, cell: CellCoords)
    {
        void [int, cell];
    }

    //#MARKER canvas

    //#SECTION board
    /** Clears the entire canvas so it can be redrawn */
    clearCanvas(game: GameObj)
    {
        const { ctx, canvas } = game;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    /** Draws the base board of the game */
    drawBaseBoard(game: GameObj)
    {
        void game;
    }

    /** Draws the contents of the revealed cells */
    drawCellContents(game: GameObj)
    {
        void game;
    }

    //#SECTION win & lose
    /** Displays a game as won */
    displayGameWon(game: GameObj)
    {
        void game;
    }

    /** Displays a game as won */
    displayGameLost(game: GameObj)
    {
        void game;
    }

    drawCell(game: GameObj, cell: CellObj, coords: CellCoords)
    {
        const { ctx, boardOpts: boardSettings } = game;
        const [x, y] = this.cellCoordsToPxPos(game, coords);



        if(!cell.revealed)
        {
            ctx.fillRect(x, y, boardSettings.cellSize[0], boardSettings.cellSize[1]);
            return;
        }

        switch(cell.type)
        {
        case "blank":
            break;
        case "number":
            break;
        case "mine":
            // TODO: maybe move somewhere else
            game.state = "exploded";
            break;
        }
    }

    cellCoordsToPxPos(game: GameObj, coords: CellCoords): [x: number, y: number]
    {
        const [w, h] = game.boardOpts.size.split("x").map(v => parseInt(v));

        // TODO:

        void [coords, w, h];

        return [0, 0];
    }

    // #MARKER Algo:
    // 
    // Cell is marked as flagged:
    // - if type "blank":  
    // - if type "number": 
    // - if type "mine":   convert cell to flag
    // - if type "flag":   
    // - if type "b"
    //
    // Cell is revealed:
    // - if type "blank":  
    // - if type "number": 
    // - if type "mine":   game over
    // - if type "flag":   do nothing
}
