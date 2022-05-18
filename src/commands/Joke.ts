import { CommandInteraction, MessageEmbed } from "discord.js";
import axios from "axios";
import { Command } from "../Command";
import { settings } from "../settings";

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
            args: [
                {
                    name: "category",
                    desc: "The category of jokes you want to get",
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
                    desc: "Enable to not get any potentially unsafe or triggering jokes",
                    type: "boolean",
                },
                {
                    name: "amount",
                    desc: "How many jokes you want to get",
                    type: "number",
                    min: 1,
                    max: 10,
                },
                {
                    name: "contains",
                    desc: "If set, only gives jokes that contain this text",
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        await int.deferReply();

        const args = this.resolveArgs(int);

        const { category, amount, contains } = args;
        const safeMode = args["safe-mode"] ?? false;

        let amt = parseInt(amount);
        if(!isNaN(amt) && amt > 10)
            amt = 10;
        else if(isNaN(amt) || amt < 1)
            amt = 1;

        const baseUrl = `https://v2.jokeapi.dev/joke/${category ?? "Any"}`;
        const urlParams = [];

        if(safeMode) urlParams.push("safe-mode");
        if(amt) urlParams.push(`amount=${amt}`);
        if(contains) urlParams.push(`contains=${encodeURIComponent(contains)}`);

        let url = baseUrl;

        if(urlParams.length > 0)
            url += `?${urlParams.join("&")}`;

        const { data, status, statusText } = await axios.get(url);

        if(status < 200 || status >= 300)
        {
            await int.editReply(`JokeAPI is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`);
            return;
        }

        if(data.error === true)
        {
            await int.editReply("Couldn't find a joke that matches the set filters.");
            return;
        }

        let jokes: JokeObj[];

        if(!data.amount)
            jokes = [data];
        else
            jokes = data.jokes;
        
        const embeds: MessageEmbed[] = [];

        jokes.forEach((j, i) => {
            const embed = new MessageEmbed()
                .setDescription(`${j.type === "single" ? j.joke : `${j.setup}\n\n${j.delivery}`}`)
                .setColor(settings.embedColors.default);

            const poweredBy = amt > 1 && i === amt - 1 || amt === 1 || !amt;

            embed.setFooter({
                text: `${jokes.length > 1 ? `(${i + 1}/${amt})${poweredBy ? " - " : ""}` : ""}${poweredBy ? "https://jokeapi.dev" : ""}`,
                ...(poweredBy ? { iconURL: "https://cdn.sv443.net/jokeapi/icon_tiny.png" } : {}),
            });

            embeds.push(embed);
        });

        await int.editReply({ embeds });
    }
}
