import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";

export class Ping extends Command {
    constructor()
    {
        super({
            name: "ping",
            desc: "Check if the bot is alive",
            perms: [],
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        await this.reply(int, "Pong!", true);
    }
}
