import { CommandInteraction, TextBasedChannel, MessageEmbed } from "discord.js";
import k from "kleur";
import { Command } from "../Command";

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
                    required: true,
                }
            ],
            perms: ["MANAGE_MESSAGES"],
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const { channel } = int;

        const args = this.resolveArgs(int);

        const amtRaw = parseInt(args?.amount);
        const amount = Math.min(Math.max(amtRaw, 1), 50);

        const logChannel = int.guild?.channels.cache.find(ch => ch.id === args.channel) as TextBasedChannel;

        try {
            if (!isNaN(amtRaw) && channel?.type === "GUILD_TEXT" && typeof(logChannel?.send) === "function") {

                await channel.messages.fetch({limit: amount})
                    .then(messages => {
                        logChannel.send(`Displaying **${amount}** logged entries:`);

                        messages.reverse().forEach(message => {
                            const messageDate = new Date(message.createdTimestamp);

                            const loggedMessageEmbed = new MessageEmbed()
                                .setAuthor({ name: `${message.author.username}#${message.author.discriminator}`, iconURL: message.author.displayAvatarURL() })
                                .setTitle("#" + channel.name)
                                .setDescription(message.content)
                                .setFooter({text: `${messageDate.getDate()} ${messageDate.toLocaleString("default", { month: "long" })} ${messageDate.getFullYear()} | ${messageDate.getHours().toString().padStart(2, "0")}:${messageDate.getMinutes().toString().padStart(2, "0")}`});

                            logChannel.send({ embeds: [loggedMessageEmbed] });
                        });
                    });
                
                await this.reply(int, `Successfully logged **${amount}** entries to **#${channel.name}**`);
            }
            else
                await this.reply(int, "Error logging messages");
        }
        catch (err) {
            await this.reply(int, "Error logging messages");

            console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
        }
    }
}
