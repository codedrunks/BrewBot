import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { embedify, formatSeconds, nowInSeconds } from "../../util";
import { addCoins, getLastWork, getTotalWorks, incrementTotalWorks, setLastWork } from "../../database/economy";
import { getUser } from "../../database/users";
import { Levels, totalWorksToLevel, baseAward } from "./Jobs";
import { randomItem } from "svcorelib";

const secs4hours = 14400;

export class Work extends Command {
    constructor() {
        super({
            name: "work",
            desc: `Work for coins, can be used every ${secs4hours / 3600} hours.`
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const userid = int.user.id;

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;

        const now = nowInSeconds();

        const userInDB = await getUser(userid);

        if(!userInDB) return this.reply(int, embedify("You don't have a bank account! Open one today with `/openaccount`!"), true);

        const lastwork = await getLastWork(userid, guildid);

        const totalworks = await getTotalWorks(userid, guildid) ?? 0;

        if(!lastwork) {
            await setLastWork(userid, guildid);
            
            const jobidx = totalWorksToLevel(totalworks);
            const job = Levels[jobidx as keyof typeof Levels];

            const payout = Math.round(job.multiplier * baseAward);

            await addCoins(userid, guildid, payout);

            await incrementTotalWorks(userid, guildid);

            return this.reply(int, embedify(`You got ${payout} coins by ${randomItem(job.phrases)}`));
        }

        const timeleft = now - lastwork;

        if(timeleft <= secs4hours) {
            return this.reply(int, embedify(`You can't work again yet. Please try again in \`${formatSeconds(secs4hours - timeleft).replace(/:/, "h").replace(/:/, "m")}s\``), true);
        } else {
            const jobidx = totalWorksToLevel(totalworks);
            const job = Levels[jobidx as keyof typeof Levels];

            const payout = Math.round(job.multiplier * baseAward);

            await addCoins(userid, guildid, payout);

            await incrementTotalWorks(userid, guildid);

            return this.reply(int, embedify(`You got ${payout} coins by ${randomItem(job.phrases)}`));
        }
    }
}
