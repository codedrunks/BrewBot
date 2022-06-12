import { CommandInteraction, Message, MessageEmbed, User } from "discord.js";
import { randRange } from "svcorelib";
import { Command } from "../../../Command";
import { settings } from "../../../settings";

const inactiveTimeout = 1000 * 30;

export class HigherLower extends Command
{
    constructor()
    {
        super({
            name: "higherlower",
            desc: "Guess the random number that is searched for only by getting the hints \"higher\" and \"lower\".",
            args: [
                {
                    name: "max",
                    desc: "The maximum number that can be chosen. Defaults to 1000. Must be between 10 and 1 000 000 000",
                    type: "number",
                    min: 0,
                    max: 1000000000,
                }
            ]
        });
    }

    baseEmbed({ username: name, avatarURL }: User)
    {
        const iconURL = avatarURL() ?? undefined;

        return new MessageEmbed()
            .setTitle("Higher Lower")
            .setColor(settings.embedColors.default)
            .setFooter({ text: "Try to type the randomly selected number only by getting a higher/lower hint. React with X to end the game." })
            .setAuthor({ name, iconURL });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        if(!int.channel)
            return;

        const author = int.user;

        const args = this.resolveArgs(int);

        const maxR = parseInt(args.max ?? 1000);

        if(isNaN(maxR))
            return await this.reply(int, "Please enter a valid maximum amount.", true);

        const max = maxR < 10 ? 10 : (maxR > 1000000000 ? 1000000000 : maxR);

        const randNum = randRange(0, max);


        const msg = await int.channel.send({ embeds: [
            this.baseEmbed(author)
                .setDescription(`Please type your guesses in this channel.\nThis message will be edited to show the hints.\n\nReact with X or wait for ${(inactiveTimeout / 1000).toFixed(0)} seconds`)
                .setFooter(null)
        ] });

        await msg.react("❌");

        this.awaitReplies(author, msg, randNum);
    }

    async awaitReplies(author: User, msg: Message, randNum: number)
    {
        const time = 1000 * 60 * 10;

        const msgColl = msg.channel.createMessageCollector({
            time,
            filter: (msg) => {
                ["stop", "exit", "end"].forEach(v => {
                    if(msg.content.toLowerCase().includes(v))
                    {
                        msg.reply({ content: "To end the game, please react with an X on this message" }).then(rep => {
                            setTimeout(() => rep.delete(), 15000);
                        });
                    }
                });

                return (msg.content.match(/^\d+$/) && msg.author.id === author.id) ?? false;
            }
        });

        const reactColl = msg.createReactionCollector({ time, filter: (react, usr) => react.emoji.name === "❌" && usr.id === author.id });

        const editEmbed = (state: "equal" | "higher" | "lower", curGuess: number, guessAmt: number) => msg.edit({ embeds: [
            this.baseEmbed(author)
                .setDescription(`Current guess: ${curGuess}\nThe number that's searched for is **${state}**\n\nYou've guessed ${guessAmt} time${guessAmt === 1 ? "" : "s"}\n`)
        ] });

        let guessesAmt = 0;

        msgColl.on("collect", async (msg) => {
            const guess = parseInt(msg.content);
            guessesAmt++;

            await msg.delete();

            if(guess === randNum)
            {
                resetTimeout(true);

                await msg.edit({ embeds: [
                    this.baseEmbed(author)
                        .setColor(settings.embedColors.gameWon)
                        .setDescription(`Congratulations! You guessed the number ${randNum} after ${guessesAmt} guess${guessesAmt === 1 ? "" : "es"}`)
                ] });

                msgColl.stop();
                reactColl.stop();

                await Promise.all(msg.reactions.cache.map(r => r.remove()));
                return;
            }

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
                .setDescription(`The game has ended.\nThe number that was searched for was **${randNum}**\nYou guessed ${guessesAmt} time${guessesAmt === 1 ? "" : "s"}`)
                .setFooter(null)
        ]});
    }
}
