import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { embedify } from "@src/util";
import { settings } from "@src/settings";
import { setPremium } from "@src/database/music";

export class Premium extends Command {
    constructor() {
        super({
            name: "premium",
            desc: "Learn more about and purchase premium",
            subcommands: [
                {
                    name: "set",
                    desc: "Give premium to current guild [DEV ONLY]",
                    perms: ["ADMINISTRATOR"],
                    args: [
                        {
                            name: "yn",
                            desc: "bool",
                            type: "boolean",
                            required: true
                        }
                    ]
                }
            ]
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void> {

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DMs"));

        if(opt.name == "set") {
            if(!settings.devs.includes(int.user.id)) return this.reply(int, embedify("You cannot use this command"), true);

            const a = int.options.getBoolean("yn");

            await setPremium(int.guild.id, a ?? false);

            return this.reply(int, embedify(`${int.guild.name} ${a ? "now has" : "no longer has"} premium`));
        }
    }
}
