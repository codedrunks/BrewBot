import { CommandInteraction, MessageButton, MessageEmbed } from "discord.js";
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
            desc: "A game of higher lower. Guess the number that is searched for only by getting the hints \"higher\" and \"lower\".",
            args: [
                {
                    name: "max",
                    desc: "The maximum number that can be chosen. Defaults to 1000. Can't be lower than 10 or higher than 1 000 000 000",
                    type: "number",
                    min: 0,
                    max: 1000000000,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        if(!int.channel)
            return;

        const args = this.resolveArgs(int);

        const maxR = parseInt(args.max ?? 1000);

        if(isNaN(maxR))
            return await this.reply(int, "Please enter a valid maximum amount.", true);

        const max = maxR < 10 ? 10 : (maxR > 1000000000 ? 1000000000 : maxR);

        const randNum = randRange(0, max);


        const baseEmbed = () => new MessageEmbed()
            .setTitle("Higher Lower")
            .setColor(settings.embedColors.default)
            .setFooter({ text: "Try to guess the number only by getting a higher/lower hint. React with X to end the game." });

        const msg = await int.channel.send({ embeds: [
            baseEmbed()
                .setDescription()
        ] });

        await msg.react("❌");

        this.awaitReplies(randNum);
    }

    async awaitReplies(randNum: number)
    {
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
                inactTo = setTimeout(() => exitGame(), inactiveTimeout);
        };

        resetTimeout();
    }
}
