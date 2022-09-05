import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { CreatePollModal } from "@src/modals/poll";

export class Poll extends Command
{
    constructor()
    {
        super({
            name: "poll",
            desc: "This command allows you to create reaction-based polls that users can vote on",
            category: "util",
            subcommands: [
                {
                    name: "create",
                    desc: "Creates a reaction-based poll in this channel",
                    args: [
                        {
                            name: "headline",
                            desc: "Enter pings and extra explanatory text to notify users of this poll.",
                            type: ApplicationCommandOptionType.String,
                        }
                    ],
                },
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const headline = int.options.get("headline")?.value as string | undefined;
        const modal = new CreatePollModal(true, headline);

        return await int.showModal(modal.getInternalModal());
    }
}
