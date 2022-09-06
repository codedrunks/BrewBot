import { ApplicationCommandOptionType, CommandInteraction, CommandInteractionOption, EmbedBuilder } from "discord.js";
import { Command } from "@src/Command";
import { CreatePollModal } from "@src/modals/poll";
import { embedify, PageEmbed, toUnix10, truncStr } from "@src/utils";
import { settings } from "@src/settings";
import { deletePoll, getExpiredPolls, getPolls } from "@src/database/guild";
import { halves } from "svcorelib";

export class Poll extends Command
{
    private interval: NodeJS.Timer;

    constructor()
    {
        super({
            name: "poll",
            desc: "This command allows you to create reaction-based polls that users can vote on",
            category: "util",
            subcommands: [
                {
                    name: "create",
                    desc: "Creates a poll in this channel",
                    args: [
                        {
                            name: "headline",
                            desc: "Enter pings (be mindful of who you ping) and extra explanatory text to notify users of this poll.",
                            type: ApplicationCommandOptionType.String,
                        },
                        // TODO:
                        // {
                        //     name: "allow_rethinking",
                        //     desc: "Set this to false to disallow people to change their mind and choose another option.",
                        //     type: ApplicationCommandOptionType.Boolean,
                        // },
                    ],
                },
                {
                    name: "list",
                    desc: "Lists all polls that are active on this server",
                },
                // {
                //     name: "cancel",
                //     desc: "Cancels a poll",
                //     perms: [PermissionFlagsBits.ManageChannels],
                // },
            ],
        });

        this.checkPolls();
        this.interval = setInterval(this.checkPolls, 1000);
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption): Promise<void>
    {
        const { guild, channel } = int;

        if(!guild || !channel)
            return this.reply(int, embedify("Please use this command in a server.", settings.embedColors.error), true);

        switch(opt.name)
        {
        case "create":
        {
            const headline = int.options.get("headline")?.value as string | undefined;
            const modal = new CreatePollModal(true, headline);

            return await int.showModal(modal.getInternalModal());
        }
        case "list":
        {
            await this.deferReply(int);

            const polls = await getPolls(guild.id);

            if(!polls || polls.length === 0)
                return this.editReply(int, embedify("Currently no polls are active on this server.\nYou can create a new one with `/poll create`", settings.embedColors.error));

            const pollList = [...polls];
            const pages: EmbedBuilder[] = [];
            const pollsPerPage = 20;
            const totalPages = Math.ceil(polls.length / pollsPerPage);

            while(pollList.length > 0)
            {
                const pollSlices = halves(pollList.splice(0, pollsPerPage));

                const ebd = new EmbedBuilder()
                    .setTitle("Active polls")
                    .setColor(settings.embedColors.default)
                    .addFields(pollSlices
                        .filter(sl => sl && sl.length > 0)
                        .map(sl => ({
                            name: "\u200B",
                            value: sl.reduce((a, c) => `${a}\n\n> **\`${c.pollId}\` - ${truncStr(c.topic.replace(/\n+/gm, " "), 64)}**\n> By <@${c.createdBy}> - **open <:open_in_browser:994648843331309589>**\nPoll ends <t:${toUnix10(c.dueTimestamp)}:R>`, "")
                        }))
                    );

                totalPages > 1 && ebd.setFooter({ text: `(${pages.length + 1}/${totalPages})` });

                pages.push(ebd);
            }

            if(pages.length > 1)
            {
                const pe = new PageEmbed(pages, int.user.id, {
                    allowAllUsersTimeout: 60 * 1000,
                    goToPageBtn: pages.length > 5,
                });

                return pe.useInt(int);
            }
            else
                return this.editReply(int, pages[0]);
        }
        case "cancel":
        {
            // TODO:
            return;
        }
        }
    }

    async checkPolls()
    {
        const expPolls = await getExpiredPolls();

        expPolls.forEach(({ guildId, pollId }) => {
            // TODO: display conclusion message & final vote numbers
            deletePoll(guildId, pollId);
        });
    }
}
