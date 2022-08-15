import { CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { setCoins } from "@database/economy";
import { embedify } from "@utils/embedify";
import { PermissionFlagsBits } from "discord-api-types/v10";

export class SetBalance extends Command {
    constructor() {
        super({
            name: "setbalance",
            desc: "Set a users balance",
            category: "restricted",
            args: [
                {
                    name: "amount",
                    type: "number",
                    desc: "Coin balance will be set to this value",
                    required: true
                },
                {
                    name: "user",
                    type: "user",
                    desc: "The user who's balance you wish to set"
                }
            ],
            memberPerms: [ PermissionFlagsBits.Administrator ],
            devOnly: true,
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const args = this.resolveArgs(int);

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;
        
        if(!args.amount && parseInt(args.amount) != 0) return this.reply(int, embedify("Please choose an amount to set the balance to."), true);

        const user = int.options.getUser("user") ?? int.user;

        await setCoins(user.id, guildid, parseInt(args.amount));

        return this.reply(int, embedify(`${user.id == int.user.id ? "Your" : `${user.username}'s`} balance has been set to ${args.amount}`));
    }
}
