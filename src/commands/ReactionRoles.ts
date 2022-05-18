import { CommandInteraction, Message, MessageReaction } from "discord.js";
import { Command } from "../Command";
import persistentData from "../persistentData";

export class ReactionRoles extends Command
{
    constructor()
    {
        super({
            name: "reactionroles",
            desc: "Sends a reaction role list in the current channel",
            perms: [ "MANAGE_ROLES", "MANAGE_MESSAGES" ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int, true);

        const { channel } = int;

        const sentMsg = await channel?.send("Click the reactions to manage your roles:\n🇦 One\n🇧 Two");

        const roleEmojis = ["🇦", "🇧"];

        if(sentMsg)
        {
            for await(const em of roleEmojis)
                await sentMsg.react(em);

            this.createCollector(roleEmojis, sentMsg);

            const { id } = sentMsg;
            await persistentData.set("reactionMessages", [id]);

            await this.editReply(int, "Sent reaction roles");
        }
        else
            await this.editReply(int, "Can't send reaction roles in this channel");
    }

    private createCollector(roleEmojis: string[], message: Message<boolean>)
    {
        const filter = (reaction: MessageReaction) => roleEmojis.includes(reaction.emoji.name ?? "_");

        const collector = message.createReactionCollector({ filter, time: 99999999 });

        collector.on("collect", (reaction, user) => {
            console.log(`${user.username} selected ${reaction.emoji.name}`);
        });

        collector.on("dispose", (reaction, user) => {
            console.log(`${user.username} unselected ${reaction.emoji.name}`);
        });

        collector.on("end", collected => {
            console.log(`Collected ${collected.size} items`);
        });
    }
}
