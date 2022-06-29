import { CommandInteraction } from "discord.js";
import { Command } from "@src/Command";

export class Ping extends Command {
    constructor()
    {
        super({
            name: "ping",
            desc: "Check if the bot is alive",
            category: "util"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        await this.reply(int, "Pong!", true);
    }
}
