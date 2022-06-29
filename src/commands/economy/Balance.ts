import { CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { getCoins } from "@database/economy";
import { embedify } from "@src/util";

export class Balance extends Command {
    constructor() {
        super({
            name: "balance",
            desc: "Gets your current coin balance",
            category: "economy",
            perms: []
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const userid = int.user.id;

        if(!int.guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const coins = await getCoins(userid, int.guild.id);
        
        if(!coins && coins != 0) return this.reply(int, embedify("Don't have an account? Open one today with `/openaccount`!"), true);

        return this.reply(int, embedify(`You have ${coins} coins`));
    }
}
