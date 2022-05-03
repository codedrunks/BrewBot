import { CommandInteraction, MessageEmbed } from "discord.js";
import k from "kleur";
import { Command, CommandMeta } from "../Command";

export class Remove extends Command {
	constructor()
	{
		const meta: CommandMeta = {
			name: "rm",
			desc: "Removes the last x messages",
			args: [
				{
					name: "amount",
					desc: "How many messages to remove. Must be between 1 and 50.",
					required: true,
				},
			],
			perms: [
				"MANAGE_MESSAGES",
			],
		};

		super(meta);
	}

	async run(int: CommandInteraction): Promise<void> {
		const { reply, channel, replied } = int;
		const args = this.resolveArgs(int);
		const amtRaw = parseInt(args?.amount);
		const amount = Math.min(Math.max(amtRaw, 1), 50);

		try
		{
			if(!isNaN(amtRaw) && channel?.type === "GUILD_TEXT")
			{
				await channel.bulkDelete(amount);
				await reply(`Deleted ${amount} message${amount !== 1 ? "s" : ""}`);
			}
			else await reply("Couldn't bulk delete messages");
		}
		catch(err)
		{
			!replied && await reply("Couldn't bulk delete messages");
			console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
		}
	}
}
