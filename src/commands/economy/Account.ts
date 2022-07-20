import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { setCoins, getCoins } from "@src/database/economy";
import { embedify } from "@utils/embedify";

export class Account extends Command {
    constructor() {
        super({
            name: "account",
            desc: "Opens a coin account with Bot Bank :tm:",
            category: "economy",
            subcommands: [
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
        
        await this.deferReply(int);

        if(!int.guild?.id) return this.followUpReply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;

        if(opts.name == "balance") {
            const user = int.options.getUser("user") ?? int.user;

            let coins = await getCoins(user.id, int.guild.id);
        
            if(!coins && coins != 0) {
                await setCoins(user.id, guildid, 0);
                coins = 0;
            }
    
            return this.followUpReply(int, embedify(`${user.id == int.user.id ? "You have" : `<@${user.id}> has`} ${coins} coins`));
        }
    }
}
