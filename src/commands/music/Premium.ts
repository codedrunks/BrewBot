import { CommandInteraction, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { embedify } from "@utils/embedify";
import { getPremium, togglePremium } from "@src/database/music";

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
                    perms: ["ADMINISTRATOR"],
                },
                {
                    name: "status",
                    desc: "Whether or not the current guild has premium"
                },
            ],
            devOnly: true,
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void> {

        await this.deferReply(int);

        if(!int.guild?.id) return this.followUpReply(int, embedify("This command cannot be used in DMs"));

        if(opt.name == "toggle") {
            const a = await togglePremium(int.guild.id);

            return this.followUpReply(int, embedify(`${int.guild.name} ${a ? "now has" : "no longer has"} premium`));
        } else if(opt.name == "status") {
            const a = await getPremium(int.guild.id);

            return this.followUpReply(int, embedify(`${int.guild.name} ${a ? "has" : "does not have"} premium`));
        }
    }
}
