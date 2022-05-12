import { CommandInteraction } from "discord.js";
import { Command, CommandMeta } from "../Command";

export class TEMPLATE extends Command {
    constructor()
    {
        const meta: CommandMeta = {
            name: "template_name",
            desc: "Template_desc",
            perms: [],
        };

        super(meta);
    }

    async run(int: CommandInteraction): Promise<void> {
        void int;
    }
}
