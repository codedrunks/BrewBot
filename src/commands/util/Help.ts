import { CommandInteraction } from "discord.js";
import { getCommands } from "@src/registry";
import { Command } from "@src/Command";
import { embedify } from "@src/util";
import { CommandCategory, CommandMeta } from "@src/types";

const commandObj: Record<CommandCategory, CommandMeta[]> = {
    "economy": [],
    "fun": [],
    "games": [],
    "mod": [],
    "music": [],
    "util": [],
    "restricted": [],
};

let finalizedString: string;

export function initHelp() {
    const commands = getCommands();

    commands.forEach(({ meta }) => {
        const cat = meta.category;

        cat && commandObj[cat].push(meta);
    });

    // finalizedString = `${Object.entries(CommandObj).map(e => `**${e[0]}**\n${e[1].map(c => `\`${c.name}\``).join("  ")}`).join("\n")}`;
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
        const helpCmds: Partial<Record<CommandCategory, CommandMeta[]>> = {};

        Object.keys(commandObj).forEach((k: keyof typeof commandObj) => {
            if(k === "restricted")
                return;

            commandObj[k].forEach((meta) => {
                if(!Array.isArray(helpCmds[k]))
                    helpCmds[k] = [];

                if(int.user)
                    helpCmds[k].push(meta);
            });
        });

        const embed = embedify(finalizedString)
            .setTitle(`${int.client.user?.username ?? "Bot"}'s Commands`);

        this.reply(int, embed);
    }
}
