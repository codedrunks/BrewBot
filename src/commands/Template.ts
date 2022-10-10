import { CommandInteraction, ApplicationCommandOptionType } from "discord.js";
import { Command } from "@src/Command";

export class TEMPLATE extends Command
{
    constructor()
    {
        super({
            name: "template_name",
            desc: "Template_desc",
            category: "util",
            args: [
                {
                    name: "example_arg",
                    desc: "Example argument",
                    type: ApplicationCommandOptionType.String,
                },
            ],
            memberPerms: [],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        void int;
    }
}
