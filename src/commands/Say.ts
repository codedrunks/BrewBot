import { CommandInteraction, TextBasedChannel } from "discord.js";
import { Command, CommandMeta } from "../Command";

export class Say extends Command {
	constructor()
	{
		const meta: CommandMeta = {
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
					desc: "Which channel to send the message in, leave empty for this channel"
				}
			]
		};

		super(meta);
	}

	async run(int: CommandInteraction): Promise<void> {
		const args = this.resolveArgs(int);

		if(args.message)
		{
			let sendChannel: TextBasedChannel | null | undefined;
			if(!args.channel)
				sendChannel = int.channel;
			else
				sendChannel = int.guild?.channels.cache.find(ch => ch.name.toLowerCase() === args.channel) as TextBasedChannel;

			if(typeof sendChannel?.send === "function")
			{
				sendChannel.send({ content: args.message });
				await this.reply(int, "Successfully sent the message");
			}
			else await this.reply(int, "Couldn't find a channel with that name");
		}
		else await this.reply(int, "Please enter a message to send");
	}
}
