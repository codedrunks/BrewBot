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
        await int.deferReply({ ephemeral: true });

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
                await int.editReply(`Successfully sent the message${args.channel ? ` in <#${sendChannel.id}>` : ""}`);
                return;
            }
            else
            {
                await int.editReply("Couldn't find a channel with that name");
                return;
            }
        }
        else
        {
            await int.editReply("Please enter a message to send");
            return;
        }
    }
}
