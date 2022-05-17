import { CommandInteraction } from "discord.js";
import { Command } from "../Command";
import persistentData from "../persistentData";

export class ReactionRoles extends Command {
    constructor()
    {
        super({
            name: "reactionroles",
            desc: "Sends a reaction role list in the current channel",
            perms: [ "MANAGE_ROLES", "MANAGE_MESSAGES" ],
        });
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
