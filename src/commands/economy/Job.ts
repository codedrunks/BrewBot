import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from '../../Command';
import { getTotalWorks } from '../../database/economy';
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

        if(!int.guild?.id) return this.reply(int, embedify(`This command cannot be used in DM's`));

        let guildid = int.guild.id;

        let totalworks = await getTotalWorks(userid, guildid);

        if(!totalworks && totalworks != 0) return this.reply(int, embedify(`We have no job records for you, do you have an account? Use \`/openaccount\` if not!`), true);

        let jobidx = totalWorksToLevel(totalworks);
        let job = Levels[jobidx as keyof typeof Levels];

        const { name, multiplier } = job;

        let username = int.user.username;

        let embed = new MessageEmbed()
            .setColor(settings.embedColors.default)
            .setTitle(`*${username}*'s Current Vocation: ${name}`)
            .setDescription(`You currently make ${Math.round(baseAward * multiplier)} per 4 hours and have worked ${totalworks} times.`);

        return this.reply(int, embed);
    }
}