import { CommandInteraction } from "discord.js";
import { Command, CommandMeta } from "../Command";
import persistentData from "../persistentData";

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
        const { channel } = int;

        const sentMsg = await channel?.send("");

        if(sentMsg)
        {
            const { id } = sentMsg;
            await persistentData.set("reactionMessages", [id]);
        }
    }
}
