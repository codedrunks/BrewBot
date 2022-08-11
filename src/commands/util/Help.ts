import { CommandInteraction } from "discord.js";
import { getCommands } from "@src/registry";
import { Command } from "@src/Command";
import { embedify } from "@utils/embedify";
import { CommandMeta } from "@src/types";

let commandObj: Record<string, CommandMeta[]>;

const categoryNames: Record<string, string> = {
    economy: "Economy",
    fun: "Fun",
    games: "Games",
    mod: "Mod",
    music: "Music",
    util: "Utility",
    restricted: "Restricted",
};

export function initHelp() {
    const commands = getCommands();

    commandObj = {
        economy: [],
        fun: [],
        games: [],
        mod: [],
        music: [],
        util: [],
        restricted: [],
    };

    commands.forEach(({ meta }) => {
        const cat = meta.category;

        cat && commandObj[cat].push(meta);
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
        const helpCmds: Partial<Record<string, CommandMeta[]>> = {};

        await this.deferReply(int);

        Object.keys(commandObj).sort().forEach((k) => {
            if(k === "restricted")
                return;

            const category = commandObj[k];

            category
                .sort((a, b) => a.name > b.name ? 1 : -1)
                .forEach((meta) => {
                    if(!Array.isArray(helpCmds[k]))
                        helpCmds[k] = [];

                    const guildUser = int.guild?.members.cache.find(m => m.id === int.user.id);

                    if(guildUser && Array.isArray(meta.perms) && meta.perms.length > 0)
                    {
                        const permNum = meta.perms.reduce((a, c) => a + (guildUser.permissions.has(c) ? 1 : 0), 0);

                        if(permNum === meta.perms.length)
                            helpCmds[k]?.push(meta);
                    }
                    else
                        helpCmds[k]?.push(meta);
                });
        });

        const description = `${Object.entries(helpCmds)
            .filter(([,v]) => Array.isArray(v) && v.length > 0)
            .map(([cat, cmds]) => `**${categoryNames?.[cat] ?? cat}:**\n${cmds!.map(c => `\`${c.name}\``).join("  ")}`).join("\n")}`;

        const embed = embedify(description)
            .setTitle(`${int.client.user?.username ?? "Bot"}'s Commands:`);

        const avatar = int.client.user?.avatarURL();

        avatar && embed.setThumbnail(avatar);

        return await this.editReply(int, embed);
    }
}
