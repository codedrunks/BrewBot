import { Client, CommandInteraction, Message, MessageReaction, TextBasedChannel, ReactionCollector, MessageEmbed, Guild } from "discord.js";
import { ReactionRole } from "../types";
import { Command } from "../Command";
import persistentData from "../persistentData";
import { settings } from "../settings";


const roles: ReactionRole[] = [
    { emoji: "🇦", id: "978021647468609606" }, // JavaScript
    { emoji: "🇧", id: "978030175470096384" }, // C#
    { emoji: "🇨", id: "978030210987479091" }, // TypeScript
    { emoji: "🇩", id: "978030239953354862" }, // Unity
    { emoji: "🇪", id: "978030260878733372" }, // Unreal
    { emoji: "🇫", id: "979134412589510757" }, // React
    { emoji: "🇬", id: "979134509368872970" }, // Angular
    // { emoji: "", name: "", id: "" },
];

export class ReactionRoles extends Command
{
    constructor(client: Client)
    {
        super({
            name: "reactionroles",
            desc: "Sends a reaction role list in the current channel",
            perms: [ "MANAGE_ROLES", "MANAGE_MESSAGES" ],
        });

        this.prepare(client);
    }

    private async prepare(client: Client)
    {
        const reactionMsgs = persistentData.get("reactionMessages");

        if(reactionMsgs)
        {
            const { guild, channel, messages } = reactionMsgs[0];

            const gui = client.guilds.cache.find(g => g.id === guild);
            gui && await gui.fetch();

            const chan = gui?.channels.cache.find(c => c.id === channel) as TextBasedChannel | undefined;

            if(!chan) return;

            await chan.messages.fetch();

            const msgs = chan.messages.cache.filter(m => messages.map(ms => ms.id).includes(m.id));

            if(msgs)
            {
                const msgArr = msgs.reduce((a, c) => { a.push(c); return a; }, [] as Message[]);

                this.createCollector(roles, msgArr);
            }
        }
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int, true);

        const { channel, guild } = int;

        if(!channel || !guild) return;

        const embeds = this.buildEmbeds(guild);

        const sentMsg = await channel?.send({ embeds });

        const emojis = roles.map(r => r.emoji);

        if(sentMsg && sentMsg.guild)
        {
            await sentMsg.guild.fetch();
            await sentMsg.guild.channels.fetch();

            for await(const em of emojis)
                await sentMsg.react(em);

            this.createCollector(roles, [/*#DEBUG*/ sentMsg ]);

            const { id } = sentMsg;

            await persistentData.set("reactionMessages", [
                {
                    messages: [ { id, emojis } ],
                    channel: sentMsg.channel.id,
                    guild: sentMsg.guild.id,
                }
            ]);

            await this.editReply(int, "Sent reaction roles");
        }
        else
            await this.editReply(int, "Can't send reaction roles in this channel");
    }

    private buildEmbeds(guild: Guild): MessageEmbed[]
    {
        const pageSize = 4;

        const totalPages = Math.ceil((roles.length - 1) / 20);

        const pageDisp = totalPages > 1 ? ` (1/${totalPages})` : "";

        const embeds = [ new MessageEmbed().setTitle(`Manage your roles${pageDisp}`) ];

        let embedIdx = 0;
        let roleColIdx = 0;

        const roleLists: string[] = [ "" ];

        roles.forEach(({ emoji, id: roleID }, i) => {
            const pageNbr = Math.ceil((i === 0 ? 1 : i) / 20);

            const roleName = guild.roles.cache.find(r => r.id === roleID);

            if(roleName)
                roleLists[roleColIdx] += `${emoji} ${roleName}\n`;

            if(i === 19)
                roleColIdx = 0;

            if(i !== 0 && i % pageSize - 1 === 0)
                roleColIdx++;

            if(i !== 0 && i % 19 === 0)
                embedIdx++;

            if(!embeds[embedIdx])
                embeds[embedIdx] = new MessageEmbed().setTitle(`Manage your roles ${pageNbr}/${totalPages}`);

            if(!roleLists[roleColIdx])
                roleLists[roleColIdx] = "";

            const filteredRoleLists = roleLists.reduce((acc: string[], cur?: string) => {
                cur && cur.length > 0 && acc.push(cur);
                return acc;
            }, []);

            if(i === roles.length - 1 || (i !== 0 && i % 19 === 0))
                filteredRoleLists.forEach((roleList, i) =>
                    embeds[embedIdx].addField(String(i + 1), roleList, true)
                );
        });

        return embeds.map(e => e.setColor(settings.embedColors.default));
    }

    /**
     * @param emojis The reactions and their emojis that should be listened for
     * @param message The messages the emoji reactions are attached to
     */
    private async createCollector(roles: ReactionRole[], messages: Message<boolean>[])
    {
        const emojis = roles.map(r => r.emoji);

        const message = messages[0];

        const filter = (reaction: MessageReaction) => emojis.includes(reaction.emoji.name ?? "_");

        // const collector = new ReactionCollector(message, { filter, dispose: true, time: 10 * 1000 });
        const collector = new ReactionCollector(message, { filter, dispose: true, time: 24 * 60 * 60 * 1000 });

        collector.on("collect", async (reaction, user) => {
            console.log(`${user.username} selected ${reaction.emoji.name}`);

            const role = roles.find(r => r.emoji === reaction.emoji.name);

            const member = message.guild?.members.cache.find(u => u.id === user.id);

            const guildRole = message.guild?.roles.cache.find(r => r.id === role?.id);

            if(member && guildRole)
            {
                member.roles.add(guildRole);

                const m = await message.channel.send(`${user.username}, I gave you the role ${guildRole?.name}`);

                setTimeout(async () => await m.delete(), 5000);
            }
            else
            {
                const m = await message.channel.send(`${user.username}, I couldn't give you that role due to an error`);

                setTimeout(async () => await m.delete(), 5000);
            }
        });

        collector.on("remove", async (reaction, user) => {
            console.log(`${user.username} removed ${reaction.emoji.name}`);

            const role = roles.find(r => r.emoji === reaction.emoji.name);

            const member = message.guild?.members.cache.find(u => u.id === user.id);

            const guildRole = message.guild?.roles.cache.find(r => r.id === role?.id);

            if(member && guildRole)
            {
                member.roles.remove(guildRole);

                const m = await message.channel.send(`${user.username}, I removed your role ${guildRole?.name}`);

                setTimeout(async () => await m.delete(), 5000);
            }
            else
            {
                const m = await message.channel.send(`${user.username}, I couldn't remove that role due to an error`);

                setTimeout(async () => await m.delete(), 5000);
            }
        });

        collector.on("dispose", (reaction, user) => {
            console.log(`${user.username} disposed ${reaction.emoji.name}`);
        });

        collector.on("end", () => {
            !collector.ended && collector.stop();

            this.createCollector(roles, messages);
        });
    }
}
