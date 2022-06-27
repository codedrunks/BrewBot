import { getCommands } from "../../registry";
import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { embedify } from "../../util";
import { CommandMeta } from "../../types";

const CommandObj: Record<string, CommandMeta[]> = {
    "economy": [],
    "fun": [],
    "games": [],
    "mod": [],
    "music": [],
    "util": []
};

export function initHelp() {
    const commands = getCommands();

    commands.forEach(c => {
        const cat = (c.meta as CommandMeta).category;

        if(!cat || cat == "restricted") return;
        else CommandObj[cat].push(c.meta);
    });
}

export class Help extends Command {
    constructor() {
        super({
            name: "help",
            desc: "List of commands",
            category: "util"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const embed = embedify(`${Object.entries(CommandObj).map(e => `**${e[0]}**\n${e[1].map(c => `\`${c.name}\``).join("  ")}`).join("\n")}`) // eslint-disable-line
            .setTitle(`${int.client.user?.username}'s Commands`);

        this.reply(int, embed);
    }
}
