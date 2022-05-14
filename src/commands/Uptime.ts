import { CommandInteraction } from "discord.js";
import { Command, CommandMeta } from "../Command";
import persistentData from "../persistentData";

export class Uptime extends Command {
    constructor()
    {
        const meta: CommandMeta = {
            name: "uptime",
            desc: "Displays the bot's uptime",
            perms: [],
        };

        super(meta);
    }

    async run(int: CommandInteraction): Promise<void> {
        const startupTs = persistentData.get("startupTime") as number;

        await int.reply({ content: `The bot has been online since ${new Date(startupTs).toUTCString()}`, ephemeral: true });
    }
}
