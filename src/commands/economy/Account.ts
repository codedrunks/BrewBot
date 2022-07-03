import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { createNewUser, createNewUserWithCoins, deleteUser } from "@database/users";
import { getCoins } from "@src/database/economy";
import { embedify } from "@src/util";

export class Account extends Command {
    constructor() {
        super({
            name: "account",
            desc: "Opens a coin account with Bot Bank :tm:",
            category: "economy",
            subcommands: [
                {
                    name: "open",
                    desc: "Opens an account with the bank"
                },
                {
                    name: "close",
                    desc: "Closes a bank account for a server member",
                    perms: ["MODERATE_MEMBERS"]
                },
                {
                    name: "balance",
                    desc: "See balance of an account",
                    args: [
                        {
                            name: "user",
                            desc: "User who's balance you want to view, blank for yourself",
                            type: "user",
                            required: false
                        }
                    ]
                }
            ]
        });
    }

    async run(int: CommandInteraction, opts: CommandInteractionOption<"cached">): Promise<void> {
        const userid = int.user.id;

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;

        if(opts.name == "open") {
            await createNewUser(userid, guildid);

            return this.reply(int, embedify(`Created or updated an account for <@${int.user.id}>`), true);
        } else if(opts.name == "close") {
            await deleteUser(userid);
    
            return this.reply(int, embedify(`<@${userid}>'s account was closed`));
        } else if(opts.name == "balance") {
            const user = int.options.getUser("user") ?? int.user;

            let coins = await getCoins(user.id, int.guild.id);
        
            if(!coins && coins != 0) {
                await createNewUserWithCoins(user.id, guildid, 0);
                coins = 0;
            }
    
            return this.reply(int, embedify(`${user.id == int.user.id ? "You have" : `<@${user.id}> has`} ${coins} coins`));
        }
    }
}
