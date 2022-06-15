import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { embedify, formatSeconds, nowInSeconds, randomFromArray } from "../../util";
import { addCoins, getLastWork, getTotalWorks, incrementTotalWorks, setLastWork } from "../../database";
import { Levels, totalWorksToLevel, baseAward } from "./Jobs";

const secs4hours = 28800;

export class Work extends Command {
    constructor() {
        super({
            name: "work",
            desc: "Work for coins, can be used every 8 hours."
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        let userid = int.user.id;

        let now = nowInSeconds();

        let lastwork = await getLastWork(userid);

        let totalworks = await getTotalWorks(userid) ?? 0;

        if(!lastwork) {
            await setLastWork(userid);
            
            let jobidx = totalWorksToLevel(totalworks);
            let job = Levels[jobidx as keyof typeof Levels];

            let payout = Math.round(job.multiplier * baseAward);

            await addCoins(userid, payout);

            await incrementTotalWorks(userid);

            return this.reply(int, embedify(`You got ${payout} coins by ${randomFromArray(job.phrases)}`));
        }

        let timeleft = now - lastwork;

        if(timeleft <= secs4hours) {
            return this.reply(int, embedify(`You can't work again yet. Please try again in \`${formatSeconds(secs4hours - timeleft).replace(/:/, 'h').replace(/:/, 'm')}s\``));
        } else {
            let jobidx = totalWorksToLevel(totalworks);
            let job = Levels[jobidx as keyof typeof Levels];

            let payout = Math.round(job.multiplier * baseAward);

            await addCoins(userid, payout);

            await incrementTotalWorks(userid);

            return this.reply(int, embedify(`You got ${payout} coins by ${randomFromArray(job.phrases)}`));
        }
    }
}