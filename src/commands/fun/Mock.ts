import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";

export class Mock extends Command
{
    constructor()
    {
        super({
            name: "mock",
            desc: "Mockifies your message",
            perms: [],
            args: [
                {
                    name: "text",
                    desc: "The text to mockify.",
                    required: true,
                },
                {
                    name: "copy",
                    desc: "Set to true to hide the bot's reply from other members, so you can copy and send it instead.",
                    type: "boolean",
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { channel } = int;

        if(!channel) return;

        const args = this.resolveArgs(int);

        const mockified = args.text.split("").map((ch, i) => i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()).join("");
        const ephemeral = (args.copy && args.copy.length > 0 && args.copy === "true") ? true : false;

        if(ephemeral)
            return await this.reply(int, mockified, ephemeral);

        await this.reply(int, "Sending message...", true);

        await channel.send(`<:mock:506303207400669204> ${mockified}`);

        return await int.deleteReply();
    }
}
