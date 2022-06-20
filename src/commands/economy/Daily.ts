import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { embedify, formatSeconds, nowInSeconds } from "@src/util";
import { addCoins, getLastDaily, setLastDaily } from "@database/economy";
import { getUser } from "@database/users";

const secs24hours = 86400;
const dailyCoinsAward = 100;

export class Daily extends Command {
    constructor() {
        super({
            name: "daily",
            desc: "Recieves a coin bonus every 24 hours",
            category: "economy"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const userid = int.user.id;

        const now = nowInSeconds();

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;

        const userInDB = await getUser(userid);

        if(!userInDB) return this.reply(int, embedify("You don't have a bank account! Open one today with `/openaccount`!"), true);

        const lastdaily = await getLastDaily(userid, int.guild.id);

        if(!lastdaily) {
            await setLastDaily(userid, guildid);
            await addCoins(userid, guildid, dailyCoinsAward);

            return this.reply(int, embedify(`You claimed your daily! You got ${dailyCoinsAward} coins!`));
        }

        const timeleft = now - lastdaily;

        if(timeleft <= secs24hours) {
            return this.reply(int, embedify(`You can't claim your daily yet. Please try again in \`${formatSeconds(secs24hours - timeleft).replace(/:/, "h").replace(/:/, "m")}s\``), true);
        } else {
            await addCoins(userid, guildid, dailyCoinsAward);

            return this.reply(int, embedify(`You claimed your daily! You got ${dailyCoinsAward} coins!`));
        }
    }
}
