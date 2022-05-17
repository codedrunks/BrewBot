import { CommandInteraction } from "discord.js";
import { Command } from "../Command";

export class TEMPLATE extends Command
{
    constructor()
    {
        super({
            name: "template_name",
            desc: "Template_desc",
            perms: [],
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        void int;
    }
}
