import { CommandInteraction, Message, EmbedBuilder, User, ApplicationCommandOptionType } from "discord.js";
import { randRange } from "svcorelib";
import { Command } from "@src/Command";
import { settings } from "@src/settings";

const inactiveTimeout = 1000 * 60;

export class HigherLower extends Command
{
    constructor()
    {
        super({
            name: "higherlower",
            desc: "Guess the random number that is searched for by only getting the hints \"higher\" and \"lower\"",
            category: "games",
            args: [
                {
                    name: "max",
                    desc: "The maximum number that can be chosen. Defaults to 1000. Must be between 10 and 1,000,000,000",
                    type: ApplicationCommandOptionType.Number,
                    min: 10,
                    max: 1_000_000_000,
                }
            ]
        });
    }

    baseEmbed(usr: User)
    {
        const ebd = new EmbedBuilder()
            .setTitle("Higher Lower")
            .setColor(settings.embedColors.default)
            .setFooter({ text: "Try to type the randomly selected number only by getting a higher/lower hint. React with X to end the game." });

        const iconURL = usr.avatarURL();
        iconURL && ebd.setAuthor({ name: usr.username, iconURL, url: `https://discord.com/users/415597358752071693/${usr.id}` });

        return ebd;
    }

    async run(int: CommandInteraction): Promise<void>
    {
        if(!int.channel)
            return;

        const author = int.user;

        const max = int.options.get("max")?.value as number | undefined ?? 1000;

        const randNum = randRange(0, max);

        await this.reply(int, "Starting the game...", true);


        const msg = await int.channel.send({ embeds: [
            this.baseEmbed(author)
                .setDescription(`Please type your guesses in this channel.\nThis message will be edited to show the hints.\n\nReact with X or wait for ${(inactiveTimeout / 1000).toFixed(0)} seconds to end the game.`)
                .setFooter(null)
        ] });

        await msg.react("❌");

        this.awaitReplies(author, msg, randNum, max);
    }

    async awaitReplies(author: User, msg: Message, randNum: number, max: number)
    {
        const time = 1000 * 60 * 10;

        const msgColl = msg.channel.createMessageCollector({
            time,
            filter: (msg) => {
                // exit game hint
                ["stop", "exit", "end", "leave"].forEach(async (v) => {
                    if(msg.author.id === author.id && msg.content.toLowerCase().startsWith(v))
                        await msg.reply({ content: "To end the game, please click the ❌ reaction" }).then(rep => {
                            setTimeout(async () => await rep.delete(), 10000);
                        });
                });

                return (msg.content.trim().match(/^\d+$/) && msg.author.id === author.id) ?? false;
            }
        });

        const reactColl = msg.createReactionCollector({ time, filter: (react, usr) => react.emoji.name === "❌" && usr.id === author.id });

        const editEmbed = (state: "equal" | "higher" | "lower", curGuess: number, guessAmt: number) => msg.edit({ embeds: [
            this.baseEmbed(author)
                .setDescription(`Current guess: **\`${curGuess}\`**\nThe number that's searched for is **\`${state}\`** (between 0 and ${max})\n\nYou've guessed ${guessAmt} time${guessAmt === 1 ? "" : "s"} so far.\n`)
        ] });

        let guessesAmt = 0;

        msgColl.on("collect", async (guessMsg) => {
            const guess = parseInt(guessMsg.content.trim());
            guessesAmt++;

            if(guess === randNum)
            {
                resetTimeout(true);

                await msg.edit({ embeds: [
                    this.baseEmbed(author)
                        .setColor(settings.embedColors.success)
                        .setDescription(`Congratulations! You guessed the number **${randNum}** after ${guessesAmt} guess${guessesAmt === 1 ? "" : "es"}.`)
                        .setFooter(null)
                ] });

                msgColl.stop();
                reactColl.stop();

                await guessMsg.delete();

                await msg.reactions.removeAll();
                return;
            }

            await guessMsg.delete();

            resetTimeout();

            if(guess < randNum)
                await editEmbed("higher", guess, guessesAmt);
            else if(guess > randNum)
                await editEmbed("lower", guess, guessesAmt);
        });

        reactColl.on("collect", async () => {
            resetTimeout(true);
            this.exitGame(author, msg, randNum, guessesAmt);
        });

        let inactTo: NodeJS.Timeout;

        /**
         * Starts and resets the inactivity timeout back to what is set with `inactiveTimeout` at the top.  
         * Calls `exitGame()` whenever the timeout is reached.
         * @param stop Set to true to stop the timeout
         */
        const resetTimeout = (stop = false) => {
            if(inactTo)
                clearTimeout(inactTo);

            if(stop !== true)
                inactTo = setTimeout(() => this.exitGame(author, msg, randNum, guessesAmt), inactiveTimeout);
        };

        resetTimeout();
    }

    async exitGame(author: User, msg: Message, randNum: number, guessesAmt: number)
    {
        await msg.edit({ embeds: [
            this.baseEmbed(author)
                .setDescription(`The game has ended.\nThe number that was searched for was **${randNum}**\nYou guessed ${guessesAmt} time${guessesAmt === 1 ? "" : "s"}.`)
                .setFooter(null)
        ]});

        await msg.reactions.removeAll();
    }
}
