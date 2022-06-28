import { getCommands } from "@src/registry";
import { CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { embedify } from "@src/util";
import { CommandMeta } from "@src/types";

const CommandObj: Record<string, CommandMeta[]> = {
    "economy": [],
    "fun": [],
    "games": [],
    "mod": [],
    "music": [],
    "util": []
};

let finalizedString: string;

export function initHelp() {
    const commands = getCommands();

    commands.forEach(c => {
        const cat = (c.meta as CommandMeta).category;

        if(!cat || cat == "restricted") return;
        else CommandObj[cat].push(c.meta);
    });

    finalizedString = `${Object.entries(CommandObj).map(e => `**${e[0]}**\n${e[1].map(c => `\`${c.name}\``).join("  ")}`).join("\n")}`;
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
        const embed = embedify(finalizedString)
            .setTitle(`${int.client.user?.username ?? "Bot"}'s Commands`);

        this.reply(int, embed);
    }
}
