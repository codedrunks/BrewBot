import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getCoins } from "../../database";

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

        let coins = await getCoins(userid);
        
        if(!coins && coins != 0) return this.reply(int, "Don't have an account? Open one today with `/openaccount`!");

        return this.reply(int, `You have ${coins} coins`);
    }
}