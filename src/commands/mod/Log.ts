import { CommandInteraction, TextChannel, MessageEmbed, ColorResolvable } from "discord.js";
import k from "kleur";
import { Command } from "../../Command";
import { settings } from "../../settings";
import persistentData from "../../persistentData";
import { PermissionFlagsBits } from "discord-api-types/v10";

export class Log extends Command {
    constructor() {
        super({
            name: "log",
            desc: "Logs the last x messages from current channel to the specified channel",
            category: "mod",
            args: [
                {
                    name: "amount",
                    desc: "How many messages to log. Must be between 1 and 100.",
                    required: true,
                },
                {
                    name: "channel",
                    type: "channel",
                    desc: "Name of log channel.",
                    required: false,
                },
                {
                    name: "start",
                    desc: "ID or URL of starting message, logs messages before selected message.",
                    required: false,
                },
            ],
            perms: ["MANAGE_MESSAGES"],
            memberPerms: [ PermissionFlagsBits.ManageMessages ],
        });
    }

    async run(int: CommandInteraction): Promise<void> {

        const { channel } = int;

        const args = this.resolveArgs(int);

        const amtRaw = parseInt(args?.amount);
        const amount = Math.min(Math.max(amtRaw, 1), 50);

        const logChannel = int.client.guilds.cache.find(g => g.id == settings.guildID)?.channels.cache.find(ch => ch.id === settings.messageLogChannel) as TextChannel;
        let startMessageID = args.start;

        if (args.start?.match(/\/[0-9]+$/)) {
            startMessageID = args.start.substring(args.start.lastIndexOf("/") + 1);
        }

        try {
            if (!isNaN(amtRaw) && channel?.type === "GUILD_TEXT" && typeof(logChannel?.send) === "function") {

                if(!args.start) {
                    channel.messages.fetch({ limit: 1 }).then(messages => {
                        const lastMessage = messages?.first();

                        if(lastMessage) {
                            startMessageID = lastMessage.id;
                        }
                    });
                }

                const messageSet:MessageEmbed[] = [];

                const embedColors: ColorResolvable[] = ["#294765", "#152E46"];
                let newEmbedColor: ColorResolvable = embedColors[0];

                channel.messages.fetch({ limit: amount > 1 ? amount - 1 : amount, before: startMessageID })
                    .then(async (messages) => {
                        
                        messages.set(startMessageID, await channel.messages.fetch(startMessageID));

                        const lastMessage = messages?.first();

                        if(amount === 1 && lastMessage) {
                            messages.delete(lastMessage.id);
                        }


                        if(persistentData.get("lastLogColor") == embedColors[0]) {
                            newEmbedColor = embedColors[1];
                        }

                        let messageEmbedString = "";

                        const messagesSize = Math.ceil(messages.size / 10);
                        
                        let i = 0;
                        let setNum = 0;

                        messages.sort((a, b) => (a.createdTimestamp > b.createdTimestamp) ? 1 : -1).forEach(message => {
                            i++;

                            const messageDate = new Date(message.createdTimestamp);

                            const messageAttachmentTypes: string[] = [];
                            const messageAttachmentNames: string[] = [];

                            message.attachments.forEach((attachment) => {
                                if (attachment.contentType && attachment.name) {
                                    messageAttachmentTypes.push(attachment.contentType);
                                    messageAttachmentNames.push(attachment.name);
                                }
                            });
                            
                            if(messageAttachmentNames.length > 0) {

                                let messageAttachmentString = "";

                                for(let i = 0; i < messageAttachmentNames.length; i++) {
                                    if(i === messageAttachmentNames.length - 1) {
                                        messageAttachmentString += `> **[${messageAttachmentTypes[i]}]** ${messageAttachmentNames[i]}`;
                                    } else {
                                        messageAttachmentString += `> **[${messageAttachmentTypes[i]}]** ${messageAttachmentNames[i]}
                                        `;
                                    }
                                }

                                messageEmbedString += (`\


                                <@${message.author.id}> in <#${channel.id}> - ${messageDate.getDate()} ${messageDate.toLocaleString("default", { month: "long" })} ${messageDate.getFullYear()} | ${messageDate.getHours().toString().padStart(2, "0")}:${messageDate.getMinutes().toString().padStart(2, "0")}
                                ${messageAttachmentString}
                                > [link](${message.url})`);
                            } else {
                                messageEmbedString += (`\


                                <@${message.author.id}> in <#${channel.id}> - ${messageDate.getDate()} ${messageDate.toLocaleString("default", { month: "long" })} ${messageDate.getFullYear()} | ${messageDate.getHours().toString().padStart(2, "0")}:${messageDate.getMinutes().toString().padStart(2, "0")}
                                > ${message.content}
                                > [link](${message.url})`);
                            }

                            if(i === 10 || (10 * setNum) + i === messages.size) {
                                const loggedMessagesEmbed = new MessageEmbed()
                                    .setDescription(messageEmbedString)
                                    .setFooter({ text: `${setNum + 1}/${messagesSize}` })
                                    .setColor(newEmbedColor);

                                if(setNum == 0) {
                                    loggedMessagesEmbed.setTitle(`Displaying **${messages.size}** ${messages.size > 1 ? "messages" : "message"}, logged by ${int.user.username}#${int.user.discriminator}.`);
                                }
                            
                                const embedLength = messageEmbedString.length;
                                
                                messageEmbedString = "";
                                i = 0; 

                                setNum++;
                                
                                if (embedLength < 6000) {
                                    messageSet.push(loggedMessagesEmbed);
                                } else {
                                    return this.reply(int, "Log exceeded 6000 characters. Try logging fewer messages at a time.");
                                }
                            }
                        });
                    }).then(() => {
                        messageSet.forEach((messageEmbed) => {
                            persistentData.set("lastLogColor", newEmbedColor).then(() => {
                                logChannel.send({ embeds: [messageEmbed] });
                            });
                        });
                    });
                    
                return await this.reply(int, `Successfully logged **${amount}** messages to **#${logChannel.name}**`);
            }
            else
                return await this.reply(int, "Error logging messages");
        }
        catch (err) {
            console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));

            return await this.reply(int, "Error logging messages");
        }
    }
}
