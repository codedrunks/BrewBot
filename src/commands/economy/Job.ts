import { CommandInteraction, MessageEmbed } from "discord.js";
import { Command } from "@src/Command";
import { getTotalWorks } from "@database/economy";
import { settings } from "@src/settings";
import { embedify } from "@src/util";
import { Levels, totalWorksToLevel, baseAward } from "@commands/economy/Jobs";

export class Job extends Command {
    constructor() {
        super({
            name: "job",
            desc: "Shows your current job and it's information",
            category: "economy"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const userid = int.user.id;

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;

        const totalworks = await getTotalWorks(userid, guildid);

        if(!totalworks || totalworks == 0) return this.reply(int, embedify("We have no job records for you, ya bum! Consider doing something using `/work`"), true);

        const jobidx = totalWorksToLevel(totalworks);
        const job = Levels[jobidx as keyof typeof Levels];

        const { name, multiplier } = job;

        const username = int.user.username;

        const embed = new MessageEmbed()
            .setColor(settings.embedColors.default)
            .setTitle(`*${username}*'s Current Vocation: ${name}`)
            .setDescription(`You currently can make $${Math.round(baseAward * multiplier)} per 4 hours and have worked ${totalworks} time${totalworks > 1 ? "s": ""}.`);

        return this.reply(int, embed);
    }
}
