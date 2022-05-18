import { CommandInteraction } from "discord.js";
import { Command } from "../Command";

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
                    desc: "The text to mockify",
                    required: true,
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        if(!int.channel) return;

        const args = this.resolveArgs(int);

        if(args.text && args.text.length > 0)
        {
            await int.reply("Sending message...");

            const mockified = args.text.split("").map((ch, i) => i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()).join("");

            await int.channel.send(`<:mock:506303207400669204> ${mockified}`);

            await int.deleteReply();
        }
    }
}
