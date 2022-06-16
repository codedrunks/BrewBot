import { settings } from "../../settings";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { Command } from "../../Command";

export class Contest extends Command
{
    constructor()
    {
        super({
            name: "contest",
            desc: "Contest command to start, vote on, and submit art contests",
            perms: [],
            subcommands: [
                {
                    name: "start",
                    desc: "Starts a new contest",
                    args: [
                        {
                            name: "name",
                            desc: "Contest name",
                            type: "string",
                            required: true,
                        },
                        {
                            name: "description",
                            desc: "Contest description",
                            type: "string",
                            required: true,
                        },
                        {
                            name: "start_date",
                            desc: "Determine the start datetime of the contest",
                            type: "string",
                            required: true,
                        },
                        {
                            name: "end_date",
                            desc: "Determine the end datetime of the contest",
                            type: "string",
                            required: true,
                        }
                    ]
                },
                {
                    name: "get_current",
                    desc: "Get the currently active contest in the server",
                },
                {
                    name: "set_channel",
                    desc: "Set the channel where contests' winners will go",
                    args: [
                        {
                            name: "channel",
                            desc: "Channel where winners will be announced",
                            type: "channel",
                            required: true
                        }
                    ]
                },
                {
                    name: "set_role",
                    desc: "Set the role that will be pinged when a new contest starts",
                    args: [
                        {
                            name: "role",
                            desc: "Role that will be pinged",
                            type: "role",
                            required: true,
                        }
                    ]
                },
                {
                    name: "submit",
                    desc: "Submit an entry to a contest",
                    args: [
                        {
                            name: "contest_id",
                            desc: "ID of contest you want to submit to",
                            type: "number",
                            required: true
                        },
                        {
                            name: "attachment",
                            desc: "The attachment you want to submit",
                            type: "attachment",
                            required: true
                        }
                    ]
                },
                {
                    name: "delete_submission",
                    desc: "Delete your contest submission",
                    args: [
                        {
                            name: "contest_id",
                            desc: "ID of contest you want your submissions removed from",
                            type: "number",
                            required: true,
                        }
                    ]
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int);

        return this.editReply(int, new MessageEmbed()
            .setColor(settings.embedColors.default)
            .setTitle("Ball")
            .setDescription("Benis")
            .setFooter({ text: "Feet" })
        );
    }
}
