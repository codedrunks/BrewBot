import { CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { getCoins, setCoins } from "@database/economy";
import { settings } from "@src/settings";
import { embedify } from "@src/util";
import { createNewUser } from "@src/database/users";

const { devs } = settings;

export class SetBalance extends Command {
    constructor() {
        super({
            name: "setbalance",
            desc: "Set a users balance",
            category: "economy",
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
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const args = this.resolveArgs(int);

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;

        if(!devs.includes(int.user.id)) return this.reply(int, embedify("Only devs can use this command."), true);
        
        if(!args.amount && parseInt(args.amount) != 0) return this.reply(int, embedify("Please choose an amount to set the balance to."), true);

        const user = int.options.getUser("user") ?? int.user;

        const coins = await getCoins(user.id, guildid);

        if(!coins && coins != 0) {
            await createNewUser(user.id, guildid, parseInt(args.amount));
        }
        else await setCoins(user.id, guildid, parseInt(args.amount));

        return this.reply(int, embedify(`${user.id == int.user.id ? "Your" : `<@${user.id}>'s`} balance has been set to ${args.amount}`));
    }
}
