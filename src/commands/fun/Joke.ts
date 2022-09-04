import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { Command } from "@src/Command";
import { axios } from "@src/utils";
import { settings } from "@src/settings";

export type JokeType = "single" | "twopart";
export type JokeCategory = "Misc" | "Programming" | "Dark" | "Pun" | "Spooky" | "Christmas";
export interface JokeFlags {
    nsfw: boolean;
    racist: boolean;
    religious: boolean;
    political: boolean;
    sexist: boolean;
    explicit: boolean;
}
interface JokeBase {
    category: JokeCategory;
    type: JokeType;
    flags: JokeFlags;
    id: number;
}
interface SingleJoke extends JokeBase {
    type: "single";
    joke: string;
}
interface TwopartJoke extends JokeBase {
    type: "twopart";
    setup: string;
    delivery: string;
}
type JokeObj = SingleJoke | TwopartJoke;

export class Joke extends Command
{
    constructor()
    {
        super({
            name: "joke",
            desc: "Gives you one or multiple random jokes",
            perms: [],
            category: "fun",
            args: [
                {
                    name: "category",
                    desc: "The category of jokes you want to get",
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        { name: "Any", value: "Any" },
                        { name: "Misc", value: "Misc" },
                        { name: "Programming", value: "Programming" },
                        { name: "Pun", value: "Pun" },
                        { name: "Spooky", value: "Spooky" },
                        { name: "Christmas", value: "Christmas" },
                        { name: "Dark", value: "Dark" },
                    ]
                },
                {
                    name: "safe-mode",
                    desc: "Disable to get potentially unsafe and triggering jokes",
                    type: ApplicationCommandOptionType.Boolean,
                },
                {
                    name: "amount",
                    desc: "How many jokes you want to get",
                    type: ApplicationCommandOptionType.Number,
                    min: 1,
                    max: 10,
                },
                {
                    name: "contains",
                    desc: "If set, only gives jokes that contain this text",
                    type: ApplicationCommandOptionType.String,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        await this.deferReply(int);

        const category = int.options.get("category")?.value as string | undefined;
        const safeMode = int.options.get("safe-mode")?.value as boolean | undefined ?? true;
        let amount = int.options.get("amount")?.value as number | undefined ?? NaN;
        const contains = int.options.get("contains")?.value as string | undefined;

        if(!isNaN(amount) && amount > 10)
            amount = 10;
        else if(isNaN(amount) || amount < 1)
            amount = 1;

        const baseUrl = `https://v2.jokeapi.dev/joke/${category ?? "Any"}`;
        const urlParams = [];

        if(safeMode) urlParams.push("safe-mode");
        if(amount) urlParams.push(`amount=${amount}`);
        if(contains) urlParams.push(`contains=${encodeURIComponent(contains)}`);

        let url = baseUrl;

        if(urlParams.length > 0)
            url += `?${urlParams.join("&")}`;

        const { data, status, statusText } = await axios.get(url, { timeout: 10000 });

        if(status < 200 || status >= 300)
            return await this.editReply(int, `JokeAPI is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`);

        if(data.error === true)
            return await this.editReply(int, "Couldn't find a joke that matches the set filters.");

        let jokes: JokeObj[];

        if(!data.amount)
            jokes = [data];
        else
            jokes = data.jokes;
        
        const embeds: EmbedBuilder[] = [];

        jokes.forEach((j, i) => {
            const embed = new EmbedBuilder()
                .setDescription(`${j.type === "single" ? j.joke : `${j.setup}\n\n${j.delivery}`}`)
                .setColor(settings.embedColors.default);

            const poweredBy = amount > 1 && i === amount - 1 || amount === 1 || !amount;

            embed.setFooter({
                text: `${jokes.length > 1 ? `(${i + 1}/${amount})${poweredBy ? " - " : ""}` : ""}${poweredBy ? "https://jokeapi.dev" : ""}`,
                ...(poweredBy ? { iconURL: "https://cdn.sv443.net/jokeapi/icon_tiny.png" } : {}),
            });

            embeds.push(embed);
        });

        await this.editReply(int, embeds);
    }
}
