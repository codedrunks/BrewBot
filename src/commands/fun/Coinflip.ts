import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "@src/Command";
import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import { randomItem, randRange } from "svcorelib";
import { tmpdir } from "os";
import { join } from "path";
import { rm, writeFile } from "fs-extra";
import { randomUUID } from "crypto";
import { settings } from "@src/settings";

type CoinType = "heads" | "tails";
type CoinStyle = "bronze" | "gold" | "silver";
type CoinMotive = "♥" | "♦" | "♣" | "♠";

type HeadsCoin = {
    style: CoinStyle;
    value: CoinMotive;
};

type TailsCoin = {
    style: CoinStyle;
    value: number;
};

type HeadsCoinChoices = {
    type: "heads";
    style: CoinStyle;
    choices: CoinMotive[];
};

type TailsCoinChoices = {
    type: "tails";
    style: CoinStyle;
    choices: number[];
};

type Coin = { type: CoinType, diameter: number, textSize: number } & (HeadsCoin | TailsCoin);

interface CoinflipProc {
    canvas: Canvas;
    ctx: CanvasRenderingContext2D;
    coinRows: Coin[][];
}

export class Coinflip extends Command
{
    /** Total size of the canvas - [width, height] */
    readonly CANVAS_SIZE = [700, 800];
    /** Radius of each coin */
    readonly COIN_RADIUS = 50;
    readonly COIN_BORDER_WIDTH = 10;

    readonly COIN_TYPES: CoinType[] = ["heads", "tails"];
    /** Possible coin styles */
    readonly COIN_STYLES: CoinStyle[] = ["bronze", "gold", "silver"];
    /** Possible coin motives */
    readonly COIN_MOTIVES: CoinMotive[] = ["♥", "♦", "♣", "♠"];
    /** Possible coin values */
    readonly COIN_VALUES: number[] = [1, 2, 5, 10, 50];

    /** Variants of tails coins that can be randomly indexed to create random coins */
    readonly TAILS_VARIANTS: TailsCoinChoices[] = this.COIN_STYLES.map(style => ({ type: "tails", style: style as CoinStyle, choices: this.COIN_VALUES }));
    /** Variants of heads coins that can be randomly indexed to create random coins */
    readonly HEADS_VARIANTS: HeadsCoinChoices[] = this.COIN_STYLES.map(style => ({ type: "heads", style: style as CoinStyle, choices: this.COIN_MOTIVES }));

    constructor()
    {
        super({
            name: "coinflip",
            desc: "Flips one or multiple coins",
            perms: [],
            category: "fun",
            args: [
                {
                    name: "amount",
                    desc: "How many coins to flip. Defaults to 1.",
                    type: ApplicationCommandOptionType.Integer,
                    min: 1,
                    max: 50,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const amount = (int.options.get("amount")?.value ?? 1) as number;

        await this.deferReply(int);

        return this.flipCoins(int, amount);
    }

    async flipCoins(int: CommandInteraction, amount: number)
    {
        const canvas = createCanvas(this.CANVAS_SIZE[0], this.CANVAS_SIZE[1]);

        const coins: Coin[] = [];
        const coinsPerRow = 4;

        // TODO: use scl.splitIntoParts()

        for(let i = 0; i < amount; i++)
            coins.push(this.getRandomCoin());

        const coinRows: Coin[][] = [];

        while(coins.length > 0)
            coinRows.push(coins.splice(0, coinsPerRow));

        const proc: CoinflipProc = {
            canvas,
            ctx: canvas.getContext("2d"),
            coinRows,
        };

        this.drawBoard(proc);

        // TODO: draw these randomly maybe? see https://www.youtube.com/watch?v=XATr_jdh-44
        for(let x = 0; x < Math.min(5, proc.coinRows.length); x++)
            for(let y = 0; y < Math.min(coinsPerRow, proc.coinRows[x].length); y++)
                this.drawCoin(proc, proc.coinRows[x][y], [
                    100 + y * (this.COIN_RADIUS * 2 + randRange(45, 65)),
                    100 + x * (this.COIN_RADIUS * 2 + randRange(45, 65)),
                ]);

        const fileName = `coinflip-${randomUUID()}.png`;
        const filePath = join(tmpdir(), fileName);

        await this.renderCoinflip(proc, filePath);

        const imageEbd = new EmbedBuilder()
            .setColor(settings.embedColors.default)
            .setImage(`attachment://${fileName}`);

        const { heads, tails } = this.getResult(proc);
        const [winner, loser] = heads > tails ? [heads, tails] : [tails, heads];

        let resultEbd: EmbedBuilder;
        if(heads !== tails)
        {
            resultEbd = new EmbedBuilder()
                .setTitle(amount > 1 ? (heads > tails ? "Heads won!" : "Tails won!") : (heads > tails ? "It's heads!" : "It's tails!"))
                .setColor(settings.embedColors.default);

            amount > 1 && resultEbd.setDescription(`**${heads > tails ? "Heads" : "Tails"}: \`${winner}\`**\n**${heads > tails ? "Tails" : "Heads"}: \`${loser}\`**`);
        }
        else
        {
            resultEbd = new EmbedBuilder()
                .setTitle("It's a tie!")
                .setColor(settings.embedColors.default);

            amount > 1 && resultEbd.setDescription(`**Heads: \`${heads}\`**\n**Tails: \`${tails}\`**`);
        }

        await int.editReply({
            embeds: [imageEbd, resultEbd],
            files: [
                {
                    attachment: filePath,
                    name: fileName,
                    description: `Coin flip. Result: ${69} heads and ${420} tails.`,
                },
            ],
        });

        await rm(filePath);
    }

    getRandomCoin(): Coin
    {
        const type = randomItem(this.COIN_TYPES);
        const style = randomItem(this.COIN_STYLES);

        const [textSize, diameter] = randomItem([
            [60, 110],
            [80, 130],
            [100, 150],
        ]);

        return {
            type,
            style,
            value: type === "heads" ? randomItem(this.COIN_MOTIVES) : randomItem(this.COIN_VALUES),
            diameter,
            textSize,
        };
    }

    drawBoard(proc: CoinflipProc)
    {
        const { ctx, canvas } = proc;

        ctx.fillStyle = "#4567ec";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawCoin(proc: CoinflipProc, coin: Coin, pos: [number, number])
    {
        const { ctx } = proc;
        const [x, y] = pos;

        let textStyle, secondFillStyle;
        switch(coin.style)
        {
        case "bronze":
            ctx.fillStyle = "#AD5F12";
            secondFillStyle = "#CD7F32";
            textStyle = "#2D1F02";
            break;
        case "silver":
            ctx.fillStyle = "#909090";
            secondFillStyle = "#C0C0C0";
            textStyle = "#151515";
            break;
        case "gold":
            ctx.fillStyle = "#CFA700";
            secondFillStyle = "#FFD700";
            textStyle = "#523104";
            break;
        }

        ctx.beginPath();
        ctx.arc(x, y, coin.diameter / 2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = secondFillStyle;

        ctx.beginPath();
        ctx.arc(x, y, coin.diameter / 2 - this.COIN_BORDER_WIDTH, 0, 2 * Math.PI);
        ctx.fill();

        // if(coin.type === "heads")
        // {
        //     const motive = coin.value as CoinMotive;

        //     // TODO:
        // }
        // else if(coin.type === "tails")
        // {
        //     const val = coin.value as number;

        //     ctx.font = "bold 35px Roboto";
        //     ctx.fillStyle = "#000";
        //     ctx.textAlign = "center";
        //     ctx.textBaseline = "middle";
        //     ctx.fillText(String(val), x - this.COIN_RADIUS, y - this.COIN_RADIUS, this.COIN_RADIUS * 2 - 5);
        // }

        const val = coin.value;

        ctx.font = `bold ${coin.textSize}px Roboto`;
        ctx.fillStyle = textStyle;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // ctx.save();
        // ctx.translate(x, y);
        // ctx.rotate(-Math.PI / 2);
        ctx.fillText(String(val).toUpperCase(), x, y, coin.diameter - 5);
        // ctx.restore();

        // ctx.fillStyle = "#f00";
        // ctx.fillRect(x, y, 3, 3);
    }

    getResult(proc: CoinflipProc): Record<CoinType, number>
    {
        let [heads, tails] = [0, 0];

        proc.coinRows.forEach(row => {
            row.forEach(coin => {
                if(coin.type === "heads")
                    heads++;
                if(coin.type === "tails")
                    tails++;
            });
        });

        return { heads, tails };
    }

    /** Renders a coinflip to a png file */
    async renderCoinflip(proc: CoinflipProc, filePath: string)
    {
        const buf = proc.canvas.toBuffer("image/png");
        await writeFile(filePath, buf);
    }
}
