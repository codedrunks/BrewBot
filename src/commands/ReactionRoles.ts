import { CommandInteraction } from "discord.js";
import { Command, CommandMeta } from "../Command";

export class ReactionRoles extends Command {
    constructor()
    {
        const meta: CommandMeta = {
            name: "reactionroles",
            desc: "Sends a reaction role list in the current channel",
            perms: [ "MANAGE_ROLES", "MANAGE_MESSAGES" ],
        };

        super(meta);
    }

    async run(int: CommandInteraction): Promise<void> {
        void int;
    }
}
