import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { embedify } from "@src/util";
import { settings } from "@src/settings";
import { togglePremium } from "@src/database/music";

export class Premium extends Command {
    constructor() {
        super({
            name: "premium",
            desc: "Learn more about and purchase premium",
            category: "music",
            subcommands: [
                {
                    name: "toggle",
                    desc: "Give premium to current guild [DEV ONLY]",
                    perms: ["ADMINISTRATOR"]
                }
            ]
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void> {

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DMs"));

        if(opt.name == "toggle") {
            if(!settings.devs.includes(int.user.id)) return this.reply(int, embedify("You cannot use this command"), true);

            const a = await togglePremium(int.guild.id);

            return this.reply(int, embedify(`${int.guild.name} ${a ? "now has" : "no longer has"} premium`));
        }
    }
}
