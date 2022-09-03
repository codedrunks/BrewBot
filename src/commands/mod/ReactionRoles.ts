// import { Client, CommandInteraction, Message, MessageReaction, ReactionCollector, MessageEmbed, EmbedFieldData } from "discord.js";
// import { Command } from "@src/Command";
// import { settings } from "@src/settings";


// type EmbedMsg = {
//     embed: MessageEmbed,
//     emojis: ReactionRole[],
// };

// const roles: ReactionRole[] = [
//     { id: "978021647468609606" }, // JavaScript
//     { id: "979416816512278548" }, // C
//     { id: "979416784610418749" }, // C++
//     { id: "978030175470096384" }, // C#
//     { id: "978030210987479091" }, // TypeScript
//     { id: "979416848489676842" }, // Rust
//     { id: "979416971282100324" }, // Ruby
//     { id: "979416891770699916" }, // Go
//     { id: "979422324912697364" }, // Python

//     { id: "978030239953354862" }, // Unity
//     { id: "978030260878733372" }, // Unreal
//     { id: "979421553810870322" }, // Visual Studio
//     { id: "979421609423147028" }, // VS Code
//     { id: "979421689484046416" }, // Atom
//     { id: "979421740063150090" }, // JetBrains

//     { id: "979134412589510757" }, // React
//     { id: "979134509368872970" }, // Angular
//     { id: "979417658011320350" }, // Vue
//     { id: "979417614474428428" }, // Bootstrap
//     { id: "979417464628736070" }, // Svelte
//     // { emoji: "", name: "", id: "" }, // 
// ].map((v, i) => ({ ...v, emoji: settings.emojiList[i] }));

// const rolesPerMsg = 20;

// export class ReactionRoles extends Command
// {
//     constructor(client: Client)
//     {
//         super({
//             name: "reactionroles",
//             desc: "Sends a reaction role list in the current channel",
//             perms: [ "MANAGE_ROLES", "MANAGE_MESSAGES" ],
//             memberPerms: [ PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageMessages ],
//         });

//         const reactionMsgs = persistentData.get("reactionMessages");

//         Array.isArray(reactionMsgs) && reactionMsgs.length > 0 && this.createCollectors(client, reactionMsgs);
//     }

//     async run(int: CommandInteraction): Promise<void>
//     {
//         await this.deferReply(int, true);

//         const { channel, guild } = int;

//         if(!channel || !guild) return;

//         const embeds = this.buildEmbeds();

//         await guild.fetch();
//         await guild.channels.fetch();

//         const messages: Required<PersistentData>["reactionMessages"] = [];

//         const sentMsgs = [];
//         for await(const ebd of embeds)
//         {
//             const m = await channel?.send({ embeds: [ ebd.embed ] });

//             if(m)
//             {
//                 sentMsgs.push(m);

//                 for await(const em of ebd.emojis)
//                     await m.react(em.emoji);

//                 messages.push({ id: m.id, emojis: ebd.emojis.map(e => e.emoji) });
//             }
//         }

//         this.createCollectors(int.client, reactionMsgs);

//         await persistentData.set("reactionMessages", {
//             guild: sentMsgs[0].guild?.id ?? int.guild?.id ?? "unknown guild",
//             channel: sentMsgs[0].channel.id,
//             messages,
//         });

//         await this.editReply(int, "Sent reaction roles");
//     }

//     private buildEmbeds(): EmbedMsg[]
//     {
//         const totalPages = Math.ceil((roles.length - 1) / rolesPerMsg);

//         const msgs: EmbedMsg[] = [];


//         const roleList = (roles: ReactionRole[]): EmbedFieldData => ({
//             name: "Roles",
//             value: roles.reduce((acc, c) => acc += `${c.emoji} <@&${c.id}>\n`, ""),
//             inline: true,
//         });

//         const ebdRoles = roles;
//         let pageNbr = 0;

//         while(ebdRoles.length > 0)
//         {
//             pageNbr++;
//             const eRoles = ebdRoles.splice(0, rolesPerMsg);

//             const half = Math.ceil(eRoles.length / 2);
//             const first = eRoles.slice(0, half);
//             const second = eRoles.slice((eRoles.length - half) * -1);

//             const pageDisp = totalPages > 1 ? ` (${pageNbr}/${totalPages})` : "";

//             msgs.push({
//                 embed: new MessageEmbed()
//                     .setTitle(`Manage your roles${pageDisp}`)
//                     .setColor(settings.embedColors.default)
//                     .setFields([ roleList(first), roleList(second) ]),
//                 emojis: eRoles,
//             });
//         }

//         return msgs;
//     }

//     private async createCollectors(client: Client, messages: ReactionMsg[])
//     {
//         for(const msg of messages)
//         {
//             // TODO: listen for all messages

//             const gld = client.guilds.cache.find(g => g.id === msg.guild);
//         }
//     }

//     private async createCollector(message: Message, msgEmojis: string[])
//     {
//         const filter = (reaction: MessageReaction) => msgEmojis.includes(reaction.emoji.name ?? "_");

//         // const collector = new ReactionCollector(message, { filter, dispose: true, time: 10 * 1000 });
//         const collector = new ReactionCollector(message, { filter, dispose: true, time: 24 * 60 * 60 * 1000 });

//         collector.on("collect", async (reaction, user) => {
//             const role = roles.find(r => r.emoji === reaction.emoji.name);

//             const member = message.guild?.members.cache.find(u => u.id === user.id);

//             const guildRole = message.guild?.roles.cache.find(r => r.id === role?.id);

//             if(member && guildRole)
//             {
//                 member.roles.add(guildRole);

//                 const m = await message.channel.send(`${user.username}, I gave you the role ${guildRole?.name}`);

//                 setTimeout(async () => await m.delete(), 5000);
//             }
//             else
//             {
//                 const m = await message.channel.send(`${user.username}, I couldn't give you that role due to an error`);

//                 setTimeout(async () => await m.delete(), 5000);
//             }
//         });

//         collector.on("remove", async (reaction, user) => {
//             const role = roles.find(r => r.emoji === reaction.emoji.name);

//             const member = message.guild?.members.cache.find(u => u.id === user.id);

//             const guildRole = message.guild?.roles.cache.find(r => r.id === role?.id);

//             if(member && guildRole)
//             {
//                 member.roles.remove(guildRole);

//                 const m = await message.channel.send(`${user.username}, I removed your role ${guildRole?.name}`);

//                 setTimeout(async () => await m.delete(), 5000);
//             }
//             else
//             {
//                 const m = await message.channel.send(`${user.username}, I couldn't remove that role due to an error`);

//                 setTimeout(async () => await m.delete(), 5000);
//             }
//         });

//         collector.on("end", () => {
//             !collector.ended && collector.stop();

//             this.createCollectors(roles, messages);
//         });
//     }
// }
