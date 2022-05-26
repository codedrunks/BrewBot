import { Client, CommandInteraction, Message, MessageReaction, TextBasedChannel, ReactionCollector, MessageEmbed, Guild } from "discord.js";
import { PersistentData, ReactionRole } from "../types";
import { Command } from "../Command";
import persistentData from "../persistentData";
import { settings } from "../settings";


type EmbedMsg = {
    embed: MessageEmbed,
    emojis: ReactionRole[],
};

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

const rolesPerMsg = 20;

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
        const reactionMsg = persistentData.get("reactionMessage");

        if(reactionMsg)
        {
            const { guild, channel, messages } = reactionMsg;

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

        await guild.fetch();
        await guild.channels.fetch();

        const messages: Required<PersistentData>["reactionMessage"]["messages"] = [];

        const sentMsgs = [];
        for await(const ebd of embeds)
        {
            const m = await channel?.send({ embeds: [ ebd.embed ] });

            if(m)
            {
                sentMsgs.push(m);

                for await(const em of ebd.emojis)
                    await m.react(em.emoji);

                messages.push({ id: m.id, emojis: ebd.emojis.map(e => e.emoji) });
            }
        }

        this.createCollector(roles, sentMsgs);

        await persistentData.set("reactionMessage", {
            guild: sentMsgs[0].guild?.id ?? int.guild?.id ?? "unknown guild",
            channel: sentMsgs[0].channel.id,
            messages,
        });

        await this.editReply(int, "Sent reaction roles");
    }

    private buildEmbeds(guild: Guild): EmbedMsg[]
    {
        const totalPages = Math.ceil((roles.length - 1) / rolesPerMsg);

        const msgs: EmbedMsg[] = [];


        const roleList = (roles: ReactionRole[]) => roles.reduce((acc, c) => acc += `${c.emoji} ${guild.roles.cache.find(r => r.id === c.id)?.name}\n`, "");

        const ebdRoles = roles;
        let pageNbr = 0;

        while(ebdRoles.length > 0)
        {
            pageNbr++;
            const eRoles = ebdRoles.splice(0, rolesPerMsg - 1);

            const half = Math.ceil(eRoles.length / 2);    
            const first = eRoles.slice(0, half);
            const second = eRoles.slice(-half);

            const pageDisp = totalPages > 1 ? ` (${pageNbr}/${totalPages})` : "";

            msgs.push({
                embed: new MessageEmbed()
                    .setTitle(`Manage your roles${pageDisp}`)
                    .setColor(settings.embedColors.default)
                    .setFields([
                        { name: "Roles", value: roleList(first), inline: true },
                        { name: "Roles", value: roleList(second), inline: true },
                    ]),
                emojis: eRoles,
            });
        }

        return msgs;
    }

    /**
     * @param emojis The reactions and their emojis that should be listened for
     * @param message The messages the emoji reactions are attached to
     */
    private async createCollector(roles: ReactionRole[], messages: Message<boolean>[])
    {
        const emojis = roles.map(r => r.emoji);

        // TODO: listen for all messages
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
