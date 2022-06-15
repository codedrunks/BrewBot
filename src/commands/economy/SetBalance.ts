import { CommandInteraction } from "discord.js";
import { Command } from '../../Command';
import { createNewUserWithCoins, setCoins } from "../../database";
import { settings } from "../../settings";
import { embedify } from "../../util";

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

        if(!int.guild?.id) return this.reply(int, embedify(`This command cannot be used in DM's`));

        let guildid = int.guild.id;

        if(!devs.includes(userid)) return this.reply(int, embedify("Only devs can use this command."));
        
        if(!args.amount && parseInt(args.amount) != 0) return this.reply(int, embedify("Please choose an amount to set the balance to."))

        if(!args.user) {
            await setCoins(userid, guildid, parseInt(args.amount));

            return this.reply(int, embedify(`Your balance has been set to ${args.amount}`));
        } else {
            await createNewUserWithCoins(args.user, guildid, parseInt(args.amount));

            let username = int.guild?.members.cache.get(args.user)?.user.username;

            return this.reply(int, embedify(`${username}'s balance has been set to ${args.amount}`));
        }
    }
}