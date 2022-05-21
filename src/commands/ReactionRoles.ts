import { Client, Collection, CommandInteraction, Message, MessageReaction, TextBasedChannel } from "discord.js";
import { Command } from "../Command";
import persistentData from "../persistentData";

export class ReactionRoles extends Command
{
    constructor(client: Client)
    {
        super({
            name: "reactionroles",
            desc: "Sends a reaction role list in the current channel",
            perms: [ "MANAGE_ROLES", "MANAGE_MESSAGES" ],
        });

        const reactionMsgs = persistentData.get("reactionMessages");

        if(reactionMsgs)
        {
            const { guild, channel, messages } = reactionMsgs[0];

            const chan = client.guilds.cache.find(g => g.id === guild)?.channels.cache.find(c => c.id === channel) as TextBasedChannel | undefined;

            chan?.messages.fetch().then(() => {
                const msgs = chan?.messages.cache.filter(m => messages.map(ms => ms.id).includes(m.id));

                if(msgs instanceof Collection)
                {
                    const msgArr: Message[] = [];

                    this.createCollector(reactionMsgs[0].messages[0].emojis, msgs.reduce((a, c) => {
                        a.push(c);
                        return a;
                    }, msgArr));
                }
            });
        }
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int, true);

        const { channel } = int;

        const sentMsg = await channel?.send("Click the reactions to manage your roles:\n🇦 One\n🇧 Two");

        const roleEmojis = ["🇦", "🇧"];

        if(sentMsg && sentMsg.guild)
        {
            for await(const em of roleEmojis)
                await sentMsg.react(em);

            this.createCollector(roleEmojis, [sentMsg]);

            const { id: msgId } = sentMsg;
            await persistentData.set("reactionMessages", [
                {
                    messages: [
                        {
                            id: msgId,
                            emojis: roleEmojis,
                        }
                    ],
                    channel: sentMsg.channel.id,
                    guild: sentMsg.guild.id,
                }
            ]);

            await this.editReply(int, "Sent reaction roles");
        }
        else
            await this.editReply(int, "Can't send reaction roles in this channel");
    }

    /**
     * @param emojis The emojis that should be listened for
     * @param message The messages the emoji reactions are attached to
     */
    private async createCollector(emojis: string[], messages: Message<boolean>[])
    {
        const message = messages[0];

        const filter = (reaction: MessageReaction) => emojis.includes(reaction.emoji.name ?? "_");

        // const collector = message.createReactionCollector({ filter, time: 24 * 60 * 60 * 1000 });
        const collector = message.createReactionCollector({ filter, time: 20 * 1000, max: 50 });

        collector.on("collect", (reaction, user) => {
            console.log(`${user.username} selected ${reaction.emoji.name}`);
        });

        collector.on("remove", (reaction, user) => {
            console.log(`${user.username} removed ${reaction.emoji.name}`);
        });

        collector.on("dispose", (reaction, user) => {
            console.log(`${user.username} disposed ${reaction.emoji.name}`);
        });

        collector.on("end", collected => {
            console.log(`Collected ${collected.size} items, rebuilding collector`);

            this.createCollector(emojis, messages);
        });
    }
}
