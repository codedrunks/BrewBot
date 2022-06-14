import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { embedify, formatSeconds, nowInSeconds } from "../../util";
import { addCoins, getLastDaily, setLastDaily } from "../../database";

const secs24hours = 86400;
const dailyCoinsAward = 100;

export class Daily extends Command {
    constructor() {
        super({
            name: "daily",
            desc: "Recieves a coin bonus every 24 hours"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        let userid = int.user.id;

        let now = nowInSeconds();

        let lastdaily = await getLastDaily(userid);

        if(!lastdaily) {
            await setLastDaily(userid);
            await addCoins(userid, dailyCoinsAward);

            return this.reply(int, embedify(`You claimed your daily! You got ${dailyCoinsAward} coins!`));
        }

        let timeleft = lastdaily - now;

        if(timeleft <= secs24hours) {
            return this.reply(int, embedify(`You can't claim your daily yet. Please try again in \`${formatSeconds(timeleft).replace(/:/, 'h').replace(/:/, 'm')}s\``));
        } else {
            await addCoins(userid, dailyCoinsAward);

            return this.reply(int, embedify(`You claimed your daily! You got ${dailyCoinsAward} coins!`));
        }
    }
}

/**
 * program flow log
 * 
 * user uses /daily
 * 
 * check if user has used daily before, if not, create an entry, reward coins, and return success message
 * 
 * check if user is able to use daily yet (now - lastdaily <= 24hoursInMs
 * if yes, award coins and return success
 * if no, return fail message
 * 
 */