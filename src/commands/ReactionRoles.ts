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

                this.createCollector(reactionMsgs[0].messages[0].emojis, msgArr);
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

            this.createCollector(emojis, [/*#DEBUG*/ sentMsg ]);

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
        const totalPages = Math.ceil(roles.length - 1 / 20);

        const embeds = [ new MessageEmbed().setTitle(`Manage your roles (1/${totalPages})`) ];
        
        let embedIdx = 0;
        let roleColIdx = 0;
        
        roles.forEach(({ emoji, id: roleID }, i) => {
            const roleLists: string[] = [ "" ];

            const pageNbr = Math.ceil((i === 0 ? 1 : i) / 20);

            const roleName = guild.roles.cache.find(r => r.id === roleID);

            if(roleName)
                roleLists[roleColIdx] += `${emoji} ${roleName}`;

            if(i === 19)
                roleColIdx = 0;

            if(i !== 0 && i % 9 === 0)
                roleColIdx++;

            if(i !== 0 && i % 19 === 0)
                embedIdx++;

            if(!embeds[embedIdx])
                embeds[embedIdx] = new MessageEmbed().setTitle(`Manage your roles ${pageNbr}/${totalPages}`);

            if(!roleLists[roleColIdx])
                roleLists[roleColIdx] = "";

            if(i === roles.length - 1 || i % 19 === 0)
            {
                for(const roleList of roleLists)
                    embeds[embedIdx].addField("Roles:", roleList);
            }
        });

        embeds.map(e => e.setColor(settings.embedColors.default));

        return embeds;
    }

    /**
     * @param emojis The emojis that should be listened for
     * @param message The messages the emoji reactions are attached to
     */
    private async createCollector(emojis: string[], messages: Message<boolean>[])
    {
        const message = messages[0];

        const filter = (reaction: MessageReaction) => emojis.includes(reaction.emoji.name ?? "_");

        // const collector = new ReactionCollector(message, { filter, dispose: true, time: 10 * 1000 });
        const collector = new ReactionCollector(message, { filter, dispose: true, time: 24 * 60 * 60 * 1000 });

        collector.on("collect", (reaction, user) => {
            console.log(`${user.username} selected ${reaction.emoji.name}`);
        });

        collector.on("remove", (reaction, user) => {
            console.log(`${user.username} removed ${reaction.emoji.name}`);
        });

        collector.on("dispose", (reaction, user) => {
            console.log(`${user.username} disposed ${reaction.emoji.name}`);
        });

        collector.on("end", () => {
            !collector.ended && collector.stop();

            this.createCollector(emojis, messages);
        });
    }
}
