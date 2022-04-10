import { Client, Message } from "discord.js";
import { Command, CommandMeta } from "src/Command";

export class Remove extends Command {
    constructor()
    {
        const meta: CommandMeta = {
            aliases: ["rm", "remove"],
            help: {
                desc: "Removes the last x messages",
            },
            perm: "mod",
        };

        super(meta);
    }

    run(client: Client, msg: Message): void {
        
    }
}
