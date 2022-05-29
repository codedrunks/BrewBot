import { CommandInteraction, TextChannel, MessageEmbed, ColorResolvable } from "discord.js";
import k from "kleur";
import { Command } from "../Command";
import { settings } from "../settings";
import persistentData from "../persistentData";

export class Log extends Command {
    constructor() {
        super({
            name: "log",
            desc: "Logs the last x messages from current channel to the specified channel",
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
        });
    }

    async run(int: CommandInteraction): Promise<void> {

        const { channel } = int;

        const args = this.resolveArgs(int);

        console.log(args);

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
                    await channel.messages.fetch({ limit: 1 }).then(messages => {
                        const lastMessage = messages?.first();

                        if(lastMessage) {
                            startMessageID = lastMessage.id;
                        }
                    });
                }

                await channel.messages.fetch({ limit: amount > 1 ? amount - 1 : amount, before: startMessageID })
                    .then(async (messages) => {
                        
                        messages.set(startMessageID, await channel.messages.fetch(startMessageID));

                        const lastMessage = messages?.first();

                        if(amount === 1 && lastMessage) {
                            messages.delete(lastMessage.id);
                        }

                        const embedColors: ColorResolvable[] = ["#294765", "#152E46"];
                        let newEmbedColor: ColorResolvable = embedColors[0];

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
                            
                            messageEmbedString += (`\


                            <@${message.author.id}> in <#${channel.id}> - ${messageDate.getDate()} ${messageDate.toLocaleString("default", { month: "long" })} ${messageDate.getFullYear()} | ${messageDate.getHours().toString().padStart(2, "0")}:${messageDate.getMinutes().toString().padStart(2, "0")}
                            > ${message.content}
                            > [link](${message.url})`);

                            if(i === 10 || (10 * setNum) + i === messages.size) {
                                const loggedMessagesEmbed = new MessageEmbed()
                                    .setDescription(messageEmbedString)
                                    .setFooter({ text: `${setNum + 1}/${messagesSize}` })
                                    .setColor(newEmbedColor);

                                if(setNum == 0) {
                                    loggedMessagesEmbed.setTitle(`Displaying **${messages.size}** messages, logged by ${int.user.username}#${int.user.discriminator}.`);
                                }
                            
                                const embedLength = messageEmbedString.length;
                                
                                messageEmbedString = "";
                                i = 0; 

                                setNum++;
                                
                                if (embedLength < 6000) {
                                    logChannel.send({ embeds: [loggedMessagesEmbed] });

                                    persistentData.set("lastLogColor", newEmbedColor);
                                } else {
                                    return this.reply(int, "Log exceeded 6000 characters. Try logging fewer messages at a time.");
                                }
                            }
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
