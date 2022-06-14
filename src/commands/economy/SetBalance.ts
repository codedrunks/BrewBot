import { CommandInteraction } from "discord.js";
import { Command } from '../../Command';
import { createNewUser, createNewUserWithCoins, getUser, setCoins } from "../../database";
import { settings } from "../../settings";

const { devs } = settings;

export class SetBalance extends Command {
    constructor() {
        super({
            name: "setbalance",
            desc: "Set a users balance",
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
        let userid = int.user.id;

        const args = this.resolveArgs(int);

        if(!devs.includes(userid)) return this.reply(int, "Only devs can use this command.");
        
        if(!args.amount) return this.reply(int, "Please choose an amount to set the balance to.")

        if(!args.user) {
            await setCoins(userid, parseInt(args.amount));

            return this.reply(int, `Your balance has been set to ${args.amount}`);
        } else {
            await createNewUserWithCoins(args.user, parseInt(args.amount));

            let username = int.guild?.members.cache.get(args.user)?.user.username;

            return this.reply(int, `${username}'s balance has been set to ${args.amount}`);
        }
    }
}