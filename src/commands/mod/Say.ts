import { PermissionFlagsBits } from "discord-api-types/v10";
import { ApplicationCommandOptionType, CommandInteraction, TextBasedChannel } from "discord.js";
import { Command } from "@src/Command";

export class Say extends Command
{
    constructor()
    {
        super({
            name: "say",
            desc: "Makes the bot send a message",
            category: "mod",
            args: [
                {
                    name: "message",
                    desc: "The message to send",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: "channel",
                    type: ApplicationCommandOptionType.Channel,
                    desc: "Which channel to send the message in, leave empty for the current channel"
                },
            ],
            memberPerms: [ PermissionFlagsBits.ManageMessages ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int, true);

        const message = int.options.get("message", true).value as string;
        const channel = int.options.get("channel")?.channel;

        let sendChannel: TextBasedChannel | null | undefined;
        if(channel)
            sendChannel = int.guild?.channels.cache.find(ch => ch.id === channel.id) as TextBasedChannel;
        else
            sendChannel = int.channel;

        if(typeof sendChannel?.send === "function")
        {
            await sendChannel.send({ content: message });
            return await this.editReply(int, `Successfully sent the message${channel ? ` in <#${sendChannel.id}>` : ""}`);
        }
        else
            return await this.editReply(int, "Couldn't find a channel with that name");
    }
}
