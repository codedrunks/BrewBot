import { ApplicationCommandOptionType, CommandInteraction, CommandInteractionOption } from "discord.js";
import { Canvas, CanvasRenderingContext2D } from "canvas";
import { Command } from "@src/Command";
import { embedify } from "@src/utils";
import { settings } from "@src/settings";

//#SECTION types

/** User-friendly coordinates of a cell */
type CellCoords = [string, number];

type CellObj = {
    type: "blank";
    revealed: boolean;
} | {
    type: "number";
    value: number;
    revealed: boolean;
} | {
    type: "mine";
    revealed: boolean;
};

interface GameObj {
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    state: "running" | "exploded" | "cleared";
    userId: string;
    guildId: string;
    channelId: string;
    size: "20x25" | "25x40" | "45x55" | "55x70";
    board: CellObj[][];
}

export class Minesweeper extends Command
{
    //#SECTION constructor
    constructor()
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
                                { name: "20 x 25 (tiny)", value: "20x25" },
                                { name: "25 x 40 (small)", value: "25x40" },
                                { name: "45 x 55 (normal)", value: "45x55" },
                                { name: "55 x 70 (large)", value: "55x70" },
                            ],
                            required: true,
                        },
                        {
                            name: "bombs",
                            desc: "How many bombs to place on the board",
                            type: ApplicationCommandOptionType.Number,
                            min: 5,
                            max: 100,
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

    //#MARKER game

    //#SECTION game management
    /** Creates a new game */
    createNewGame(int: CommandInteraction)
    {
        const userId = int.user.id;
        const guildId = int.guild!.id;
        const channelId = int.channel!.id;

        const width = 500,
            height = 800;

        const canvas = new Canvas(width, height, "image");

        const size = int.options.get("size", true).value as GameObj["size"];

        const game: GameObj = {
            canvas,
            ctx: canvas.getContext("2d"),
            state: "running",
            userId,
            guildId,
            channelId,
            size,
            board: this.createNewBoard(size),
        };

        void game;
    }

    /** Creates a new randomized minesweeper board */
    createNewBoard(size: GameObj["size"]): CellObj[][]
    {
        const [w, h] = size.split("x").map(v => parseInt(v));

        const newBoard: CellObj[][] = [];

        for(let y = 0; y < h; y++)
        {
            newBoard.push([]);

            for(let x = 0; x < w; x++)
                newBoard[y].push({ type: "blank", revealed: false });
        }

        return newBoard;
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
    /** Clears the board */
    clearBoard(game: GameObj)
    {
        void game;
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
}
