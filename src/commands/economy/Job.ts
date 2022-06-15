import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from '../../Command';
import { getTotalWorks } from '../../database';
import { settings } from '../../settings';
import { embedify } from '../../util';
import { Levels, totalWorksToLevel, baseAward } from "./Jobs";



export class Job extends Command {
    constructor() {
        super({
            name: "job",
            desc: "Shows your current job and it's information"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        let userid = int.user.id;

        let totalworks = await getTotalWorks(userid);

        if(!totalworks && totalworks != 0) return this.reply(int, embedify(`You do not appear to have an account with us, open one today with \`/openaccount\`!`))

        let jobidx = totalWorksToLevel(totalworks);
        let job = Levels[jobidx as keyof typeof Levels];

        const { name, multiplier } = job;

        let embed = new MessageEmbed()
            .setColor(settings.embedColors.default)
            .setTitle(`Current Vocation: ${name}`)
            .setDescription(`You currently make ${Math.round(baseAward * multiplier)} per 4 hours and have worked ${totalworks} times.`);

        return this.reply(int, embed);
    }
}