import { CommandInteraction } from "discord.js";
import { Command, CommandMeta } from "../Command";

export class Ping extends Command {
    constructor()
    {
        const meta: CommandMeta = {
            name: "ping",
            desc: "Check if the bot is alive",
            perms: [],
        };

        super(meta);
    }

    async run(int: CommandInteraction): Promise<void> {
        await this.reply(int, "Pong!");
    }
}
