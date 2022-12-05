import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { emojis } from "@src/utils";

export class Mock extends Command
{
    constructor()
    {
        super({
            name: "mock",
            desc: "MoCkIfIeS yOuR mEsSaGe",
            category: "fun",
            perms: [],
            args: [
                {
                    name: "text",
                    desc: "The text to mockify",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "copy",
                    desc: "Set to true to hide the bot's reply from other members, so you can copy and send it yourself",
                    type: ApplicationCommandOptionType.Boolean,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { channel } = int;

        if(!channel) return;

        const text = int.options.get("text", true).value as string;
        const copy = int.options.get("copy")?.value as boolean | undefined;

        const mockified = text.split("").map((ch, i) => i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()).join("");
        const ephemeral = copy ?? false;

        if(ephemeral)
            return await this.reply(int, mockified, ephemeral);

        await channel.send(`${emojis.mock} ${mockified}`);

        await this.reply(int, "Sent the message.", true);
    }
}
