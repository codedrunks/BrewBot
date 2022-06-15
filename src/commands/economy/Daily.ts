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

        let timeleft = now - lastdaily;

        if(timeleft <= secs24hours) {
            return this.reply(int, embedify(`You can't claim your daily yet. Please try again in \`${formatSeconds(secs24hours - timeleft).replace(/:/, 'h').replace(/:/, 'm')}s\``));
        } else {
            await addCoins(userid, dailyCoinsAward);

            return this.reply(int, embedify(`You claimed your daily! You got ${dailyCoinsAward} coins!`));
        }
    }
}