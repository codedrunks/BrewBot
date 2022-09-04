import { CommandInteraction, TextChannel, EmbedBuilder, ColorResolvable, ApplicationCommandOptionType, ChannelType } from "discord.js";
import k from "kleur";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { createGuildSettings, createNewGuild, getGuild, getGuildSettings, setGuild } from "@src/database/guild";
import { embedify, toUnix10 } from "@src/utils";

export class Log extends Command {
    constructor() {
        super({
            name: "log",
            desc: "Logs the last x messages from current channel to the specified channel",
            category: "mod",
            args: [
                {
                    name: "amount",
                    desc: "How many messages to log.",
                    type: ApplicationCommandOptionType.Number,
                    min: 1,
                    max: 100,
                    required: true,
                },
                {
                    name: "channel",
                    type: ApplicationCommandOptionType.Channel,
                    desc: "Name of log channel.",
                },
                {
                    name: "start",
                    desc: "ID or URL of starting message, logs messages before selected message.",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
            ],
            memberPerms: [ PermissionFlagsBits.ManageMessages ],
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const { guild, channel } = int;

        if(!guild || !channel)
            return this.reply(int, embedify("This command can only be used in a server.", settings.embedColors.error), true);

        // TODO(sv): make channel arg not required and grab logChannel from db if channel arg is not filled

        const amount = int.options.get("amount", true).value as number;
        const logChan = int.options.get("channel")?.channel;
        const start = int.options.get("start")?.value as string | undefined;

        await this.deferReply(int, true);

        const g = await getGuild(guild.id);
        const gld = g ?? await createNewGuild(guild.id);

        const gs = await getGuildSettings(guild.id);
        const gldSettings = gs ?? await createGuildSettings(guild.id);

        const logChannel = (logChan ?? guild.channels.cache.find(c => c.id === gldSettings.botLogChannel) ?? undefined) as TextChannel | undefined;

        let startMessageID = start;

        if (start?.match(/\/[0-9]+$/)) {
            startMessageID = start.substring(start.lastIndexOf("/") + 1);
        }

        try {
            if (channel?.type === ChannelType.GuildText && typeof(logChannel?.send) === "function") {

                if(!start) {
                    channel.messages.fetch({ limit: 1 }).then(messages => {
                        const lastMessage = messages?.first();

                        if(lastMessage) {
                            startMessageID = lastMessage.id;
                        }
                    });
                }

                const messageSet:EmbedBuilder[] = [];

                const embedColors: ColorResolvable[] = ["#294765", "#152E46"];
                let newEmbedColor: ColorResolvable = embedColors[0];

                channel.messages.fetch({ limit: amount, before: startMessageID })
                    .then(async (messages) => {
                        
                        messages.set(startMessageID!, await channel.messages.fetch(startMessageID!));

                        const lastMessage = messages?.first();

                        if(amount === 1 && lastMessage) {
                            messages.delete(lastMessage.id);
                        }

                        if(gld.lastLogColor == embedColors[0] || !gld.lastLogColor) {
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


                                <@${message.author.id}> - <t:${toUnix10(messageDate)}:f>
                                ${message.embeds.length > 0 ? "(embed)" : (messageAttachmentString.length > 0 ? messageAttachmentString : "(other)")}
                                > [show message <:open_in_browser:994648843331309589>](${message.url})`);
                            } else {
                                messageEmbedString += (`\


                                <@${message.author.id}> - <t:${toUnix10(messageDate)}:f>
                                > ${message.embeds.length > 0 ? "(embed)" : (message.content && message.content.length > 0 ? message.content : "(other)")}
                                > [show message <:open_in_browser:994648843331309589>](${message.url})`);
                            }

                            if(i === 10 || (10 * setNum) + i === messages.size) {
                                const loggedMessagesEmbed = new EmbedBuilder()
                                    .setDescription(`Logged by <@${int.user.id}> in channel <#${channel.id}>${messageEmbedString}`)
                                    .setFooter({ text: `${setNum + 1}/${messagesSize}` })
                                    .setColor(newEmbedColor);

                                if(setNum == 0) {
                                    loggedMessagesEmbed.setTitle(`Displaying **${messages.size}** logged ${messages.size > 1 ? "messages" : "message"}`);
                                }
                            
                                const embedLength = messageEmbedString.length;
                                
                                messageEmbedString = "";
                                i = 0; 

                                setNum++;
                                
                                if (embedLength < 6000) {
                                    messageSet.push(loggedMessagesEmbed);
                                } else {
                                    return this.editReply(int, "Log exceeded 6000 characters. Try logging fewer messages at a time.");
                                }
                            }
                        });
                    }).then(async () => {
                        for await(const embed of messageSet) {
                            gld.lastLogColor = String(newEmbedColor);

                            await setGuild(gld);
                            logChannel.send({ embeds: [embed] });
                        }

                        return await this.editReply(int, embedify(`Successfully logged **${amount}** message${amount === 1 ? "" : "s"} to **#${logChannel.name}**`, settings.embedColors.default));
                    });
            }
            else
                return await this.editReply(int, embedify("Error logging messages. Please make sure you set a default log channel or provided the channel command argument.", settings.embedColors.error));
        }
        catch (err) {
            console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));

            if(int.replied || int.deferred)
                return await this.editReply(int, embedify("Error logging messages", settings.embedColors.error));
            else
                return await this.reply(int, embedify("Error logging messages", settings.embedColors.error));
        }
    }
}
