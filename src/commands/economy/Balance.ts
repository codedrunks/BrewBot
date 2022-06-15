import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getCoins } from "../../database";
import { embedify } from "../../util";

export class Balance extends Command {
    constructor() {
        super({
            name: "balance",
            desc: "Gets your current coin balance",
            perms: []
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        let userid = int.user.id;

        if(!int.guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        let coins = await getCoins(userid, int.guild.id);
        
        if(!coins && coins != 0) return this.reply(int, embedify("Don't have an account? Open one today with `/openaccount`!"));

        return this.reply(int, embedify(`You have ${coins} coins`));
    }
}