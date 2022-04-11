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

	async run({ reply }: CommandInteraction): Promise<void> {
		try
		{
			await reply({ embeds: [ new MessageEmbed().setDescription("chungus") ] });
			console.log("reply sent");
		}
		catch(err)
		{
			console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
		}
	}
}
