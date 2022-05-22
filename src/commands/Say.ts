import { CommandInteraction, TextBasedChannel } from "discord.js";
import { Command } from "../Command";

export class Say extends Command
{
    constructor()
    {
        super({
            name: "say",
            desc: "Makes the bot send a message",
            perms: [ "MANAGE_MESSAGES" ],
            args: [
                {
                    name: "message",
                    desc: "The message to send",
                    required: true
                },
                {
                    name: "channel",
                    type: "channel",
                    desc: "Which channel to send the message in, leave empty for the current channel"
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int, true);

        const args = this.resolveArgs(int);

        if(args.message)
        {
            let sendChannel: TextBasedChannel | null | undefined;
            if(args.channel)
                sendChannel = int.guild?.channels.cache.find(ch => ch.id === args.channel) as TextBasedChannel;
            else
                sendChannel = int.channel;

            if(typeof sendChannel?.send === "function")
            {
                await sendChannel.send({ content: args.message });
                return await this.editReply(int, `Successfully sent the message${args.channel ? ` in <#${sendChannel.id}>` : ""}`);
            }
            else
                return await this.editReply(int, "Couldn't find a channel with that name");
        }
        else
            return await this.editReply(int, "Please enter a message to send");
    }
}
