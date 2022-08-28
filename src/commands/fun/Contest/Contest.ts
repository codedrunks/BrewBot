import { settings } from "@src/settings";
import { ApplicationCommandOptionType, CommandInteraction, CommandInteractionOption, EmbedBuilder } from "discord.js";
import { Command } from "@src/Command";
import { deleteContestSubmission, getAllContestsInGuild, getContestById, getCurrentContest, getSubmissionsOfContest, setContestChannel, setContestRole, submitContestEntry, unvoteContest, voteContest } from "@database/contest";
import { embedify } from "@utils/embedify";
import { bold, channelMention, hyperlink, userMention, inlineCode, roleMention, strikethrough, time, underscore } from "@discordjs/builders";
import { ContestModal } from "@src/modals/contest";
import { DatabaseError } from "@database/util";

export class Contest extends Command
{
    private readonly embedFieldsLimit = 25;
    private readonly fieldValueLimit = 1024;
    constructor()
    {
        super({
            name: "contest",
            desc: "Contest command to start, vote on, and submit art contests",
            perms: [],
            category: "fun",
            subcommands: [
                {
                    name: "add",
                    desc: "Adds a new contest",
                    perms: ["ADMINISTRATOR"]
                },
                {
                    name: "current",
                    desc: "Get the currently active contest in the server",
                },
                {
                    name: "list",
                    desc: "Lists all the contests"
                },
                {
                    name: "info",
                    desc: "Get info about a certain contest",
                    args: [
                        {
                            name: "contest_id",
                            desc: "ID of contest you want the info of",
                            type: ApplicationCommandOptionType.Number,
                            required: true,
                        }
                    ]
                },
                {
                    name: "set_channel",
                    desc: "Set the channel where contests' winners will go",
                    args: [
                        {
                            name: "channel",
                            desc: "Channel where winners will be announced",
                            type: ApplicationCommandOptionType.Channel,
                            required: true
                        }
                    ],
                    perms: ["ADMINISTRATOR"]
                },
                {
                    name: "set_role",
                    desc: "Set the role that will be pinged when a new contest starts",
                    args: [
                        {
                            name: "role",
                            desc: "Role that will be pinged",
                            type: ApplicationCommandOptionType.Role,
                            required: true,
                        }
                    ],
                    perms: ["ADMINISTRATOR"]
                },
                {
                    name: "submit",
                    desc: "Submit an entry to a contest",
                    args: [
                        {
                            name: "contest_id",
                            desc: "ID of contest you want to submit to",
                            type: ApplicationCommandOptionType.Number,
                            required: true
                        },
                        {
                            name: "attachment",
                            desc: "The attachment you want to submit",
                            type: ApplicationCommandOptionType.Attachment,
                            required: true
                        }
                    ]
                },
                {
                    name: "vote",
                    desc: "Vote for your favorite submission",
                    args: [
                        {
                            name: "contest_id",
                            desc: "ID of contest you want to vote on",
                            type: ApplicationCommandOptionType.Number,
                            required: true,
                        },
                        {
                            name: "contestant",
                            desc: "Contestant you want to vote for",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        }
                    ]
                },
                {
                    name: "unvote",
                    desc: "Remove your vote from a submission",
                    args: [
                        {
                            name: "contest_id",
                            desc: "ID of contest you want to remove the vote from",
                            type: ApplicationCommandOptionType.Number,
                            required: true,
                        },
                        {
                            name: "contestant",
                            desc: "Contestant you want to remove the vote from",
                            type: ApplicationCommandOptionType.User,
                            required: true,
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
                            type: ApplicationCommandOptionType.Number,
                            required: true,
                        },
                    ]
                },
                {
                    name: "mod_delete_submission",
                    desc: "Delete a user's contest submission",
                    args: [
                        {
                            name: "contest_id",
                            desc: "ID of contest you want your submissions removed from",
                            type: ApplicationCommandOptionType.Number,
                            required: true,
                        },
                        {
                            name: "user",
                            desc: "User you want to delete the submission of",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                    perms: ["ADMINISTRATOR"]
                }
            ]
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        if (opt.name != "add")
            await this.deferReply(int);

        switch(opt.name)
        {
        case "add":
            return await this.add(int);
        case "current":
            return await this.getCurrent(int);
        case "info":
            return await this.info(int);
        case "list":
            return await this.list(int);
        case "set_channel":
            return await this.setChannel(int);
        case "set_role":
            return await this.setRole(int);
        case "submit":
            return await this.submit(int);
        case "vote":
            return await this.vote(int);
        case "unvote":
            return await this.unvote(int);
        case "delete_submission":
            return await this.deleteSubmission(int);
        case "mod_delete_submission":
            return await this.modDeleteSubmission(int);
        }
    }

    async add(int: CommandInteraction) {
        const modal = new ContestModal();

        return await int.showModal(modal.getInternalModal());
    }

    async getCurrent(int: CommandInteraction) {
        if(!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));
        const contest = await getCurrentContest(int.guild.id);

        const embeds = [];

        if (!contest) {
            return await this.editReply(int, embedify("There's no currently active contest"));
        }

        const embedDesc = `${contest.description}\n\nuse \`/contest submit ${contest.id}\` to submit your entry\n\n24 hour voting period will start after the deadline`;

        const embed = new EmbedBuilder()
            .setTitle(contest.name)
            .setDescription(embedDesc)
            .setColor(settings.embedColors.default)
            .setFields([
                {
                    name: "Start",
                    value: time(contest.startDate),
                    inline: true,
                },
                {
                    name: "End",
                    value: time(contest.endDate),
                    inline: true,
                }
            ])
            .setFooter({ text: `Contest ID: ${contest.id} • Datetime is displayed in your timezone`});

        embeds.push(embed);

        const submissions = await getSubmissionsOfContest(int.guild.id, contest.id);

        if (submissions.length) {
            let followUpDesc = "Click on the names to see the submission\n\n";

            submissions.forEach(submission => {
                const guildMember = int.guild?.members.cache.find(user => user.id === submission.userId);
                const linkifiedUsername = hyperlink(guildMember?.user?.username ?? "User", submission.content);
                followUpDesc += `- ${linkifiedUsername} (${submission._count.votes})\n`;
            });

            const submissionsEmbed = new EmbedBuilder()
                .setTitle("Submissions")
                .setDescription(followUpDesc)
                .setColor(settings.embedColors.default);

            embeds.push(submissionsEmbed);
        }

        return await this.editReply(int, embeds);
    }

    async info(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const embeds = [];

        const contestId = int.options.get("contest_id", true).value as number;

        const contest = await getContestById(int.guild.id, contestId);

        if (!contest) {
            return await this.editReply(int, embedify("There's no contest with that id"));
        }

        const didContestEnd = new Date().getTime() >= contest.endDate.getTime();

        const field1Name = didContestEnd ? "Started" : "Start";
        const field2Name = didContestEnd ? "Ended" : "End";

        const embedDesc = didContestEnd ? contest.description : `${contest.description}\n\nuse \`/contest submit ${contest.id}\` to submit your entry\n\n24 hour voting period will start after the deadline`;

        const embed = new EmbedBuilder()
            .setTitle(contest.name)
            .setDescription(embedDesc)
            .setColor(settings.embedColors.default)
            .setFields([
                {
                    name: field1Name,
                    value: time(contest.startDate),
                    inline: true,
                },
                {
                    name: field2Name,
                    value: time(contest.endDate),
                    inline: true,
                }
            ])
            .setFooter({ text: `Contest ID: ${contest.id} • Datetime is displayed in your timezone`});

        embeds.push(embed);

        const submissions = await getSubmissionsOfContest(int.guild.id, contest.id);

        if (submissions.length) {
            let submissionsDesc = "";

            submissions.forEach((submission, i) => {
                const linkifiedUsername = hyperlink(userMention(submission.userId), submission.content);
                submissionsDesc += `- ${linkifiedUsername} (${submission._count.votes})`;
                if (i !== submissions.length - 1) submissionsDesc += "\n";
            });

            const submissionsEmbeds = [];

            if (submissionsDesc.length > 2048) {
                const submissionsArr = submissionsDesc.split("\n");
                let field = "";
                const fields = [];
                while (submissionsArr.length) {
                    const submission = submissionsArr.splice(0, 1)[0];
                    if ((field.length + submission.length + "\n".length) > this.fieldValueLimit) {
                        fields.push(field);
                        field = "";
                    }
                    field += submission + "\n";

                    if (!submissionsArr.length) {
                        fields.push(field);
                    }
                }

                const numOfEmbeds = Math.floor(fields.length / this.embedFieldsLimit) + 1;

                for (let i = 0; i < numOfEmbeds; i++) {
                    const newEmbed = new EmbedBuilder()
                        .setTitle("Submissions")
                        .setColor(settings.embedColors.default)
                        .setFooter({ text: `Page ${i + 1}/${numOfEmbeds}` });

                    for (let i = 0; i < fields.length; i++) {
                        console.log(fields[i]);
                        newEmbed.addFields([{ name: "\u200b", value: fields[i], inline: true }]);
                    }

                    submissionsEmbeds.push(newEmbed);
                }

                embeds.push(...submissionsEmbeds);
            } else {
                const submissionsEmbed = new EmbedBuilder()
                    .setTitle("Submissions")
                    .setDescription(submissionsDesc)
                    .setColor(settings.embedColors.default);
                embeds.push(submissionsEmbed);
            }
        }

        return await this.editReply(int, embeds);
    }

    async list(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contests = await getAllContestsInGuild(int.guild.id);

        const embeds: EmbedBuilder[] = [];

        let embedDesc = "use `/contest info` to get more information\n\n\n\n";

        contests.forEach(contest => {
            const id = inlineCode(contest.id.toString());
            let name = "";
            if (new Date().getTime() > contest.endDate.getTime()) {
                name = strikethrough(contest.name);
            } else {
                name = bold(underscore(contest.name));
            }

            embedDesc += `${id} | ${name}\n`;
        });

        if (embedDesc.length > 2048) {
            const contestsEmbeds = [];

            const [desc, contestEntriesStr] = embedDesc.split("\n\n\n\n");
            const contestEntries = contestEntriesStr.split("\n");
            let field = "";
            const fields = [];
            while (contestEntries.length) {
                const entry = contestEntries.splice(0, 1)[0];
                if ((field.length + entry.length + "\n".length) > this.fieldValueLimit) {
                    fields.push(field);
                    field = "";
                }
                field += entry + "\n";

                if (!contestEntries.length) {
                    fields.push(field);
                }
            }

            const numOfEmbeds = Math.floor(fields.length / this.embedFieldsLimit) + 1;

            for (let i = 0; i < numOfEmbeds; i++) {
                const newEmbed = new EmbedBuilder()
                    .setTitle("Contests")
                    .setDescription(desc)
                    .setColor(settings.embedColors.default)
                    .setFooter({ text: `Page ${i + 1}/${numOfEmbeds}` });

                for (let i = 0; i < fields.length; i++) {
                    console.log(fields[i]);
                    newEmbed.addFields([{ name: "\u200b", value: fields[i], inline: true }]);
                }

                contestsEmbeds.push(newEmbed);
            }

            embeds.push(...contestsEmbeds);
        } else {
            const embed = new EmbedBuilder()
                .setTitle("Contests")
                .setColor(settings.embedColors.default)
                .setDescription(embedDesc);
            embeds.push(embed);
        }

        return await this.editReply(int, embeds);
    }

    async setChannel(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const chan = int.options.get("channel", true).channel!;
        const err = await setContestChannel(int.guild.id, chan.id);

        if (err === DatabaseError.UNKNOWN)
            return await this.editReply(int, embedify("An error has occurred while setting channel. please try again later"));

        return await this.editReply(int, embedify(`Successfully set the contests channel to ${channelMention(chan.id)}`));
    }

    async setRole(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const role = int.options.get("role", true).role!;
        const err = await setContestRole(int.guild.id, role.id);

        if (err === DatabaseError.UNKNOWN)
            return await this.editReply(int, embedify("An error has occurred while setting role. please try again later"));

        return await this.editReply(int, embedify(`Successfully set the contests role to ${roleMention(role.id)}`));
    }

    async submit(int: CommandInteraction) {
        if (!int.guild?.id || !int.channel?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contestId = int.options.get("contest_id", true).value as number;
        const attachment = int.options.get("attachment", true).attachment!;

        const contest = await getContestById(int.guild.id, contestId);

        if (!contest) {
            return await this.editReply(int, embedify("There's no contest with that id"));
        }

        if (contest.endDate.getTime() < new Date().getTime()) {
            return await this.editReply(int, embedify("This contest has expired"));
        }

        if (contest.startDate.getTime() > new Date().getTime()) {
            return await this.editReply(int, embedify("This contest hasn't started yet"));
        }

        await this.editReply(int, embedify(`${bold(int.user.username)}'s submission for Contest \`${contest.name}\` wth ID: \`${contestId}\``));
        await int.channel.send({ files: [attachment] });

        const reply = await int.fetchReply();
        const submissionLink = `https://discordapp.com/channels/${int.guild.id}/${int.channel.id}/${reply.id}`;

        const err = await submitContestEntry(int.guild.id, contestId, int.user.id, submissionLink);

        if (err === DatabaseError.UNKNOWN)
            return await this.followUpReply(int, embedify("An error has occurred while submitting your entry, please try again"));

        return await this.followUpReply(int, embedify("Successfully submitted your entry!"));
    }

    async vote(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contestId = int.options.get("contest_id", true).value as number;
        const user = int.options.getUser("contestant", true);

        const now = new Date().getTime();

        const contest = await getContestById(int.guild.id, contestId);

        if (!contest) {
            return await this.editReply(int, embedify("There's no contest with that id"));
        }

        if (contest.startDate.getTime() > now) {
            return await this.editReply(int, embedify("This contest hasn't started yet"));
        }

        if (now >= contest.startDate.getTime() && now < contest.endDate.getTime()) {
            return await this.editReply(int, embedify("The voting period for this contest hasn't started yet"));
        }

        if (now >= contest.endDate.getTime() + 24 * 3600 * 1000) {
            return await this.editReply(int, embedify("The voting period for this contest has ended"));
        }

        const err = await voteContest(int.guild.id, contestId, user.id, int.user.id);

        switch (err) {
        case DatabaseError.DUPLICATE:
            return await this.editReply(int, embedify("You already voted for this person. use `/contest unvote` to remove your vote"));
        case DatabaseError.NO_CONTEST_SUBMISSION:
            return await this.editReply(int, embedify("This user doesn't have a submission in this contest"));
        case DatabaseError.UNKNOWN:
            return await this.editReply(int, embedify("An error has occurred while registering your vote, please try again later"));
        }

        return await this.editReply(int, embedify(`Successfully voted for ${userMention(user.id)}`));
    }

    async unvote(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contestId = int.options.get("contest_id", true).value as number;
        const user = int.options.getUser("contestant", true);

        const now = new Date().getTime();

        const contest = await getContestById(int.guild.id, contestId);

        if (!contest) {
            return await this.editReply(int, embedify("There's no contest with that id"));
        }

        if (contest.startDate.getTime() > now) {
            return await this.editReply(int, embedify("This contest hasn't started yet"));
        }

        if (now >= contest.startDate.getTime() && now < contest.endDate.getTime()) {
            return await this.editReply(int, embedify("The voting period for this contest hasn't started yet"));
        }

        if (now >= contest.endDate.getTime() + 24 * 3600 * 1000) {
            return await this.editReply(int, embedify("The voting period for this contest has ended"));
        }

        const err = await unvoteContest(int.guild.id, contestId, user.id, int.user.id);

        switch (err) {
        case DatabaseError.OPERATION_DEPENDS_ON_REQUIRED_RECORD_THAT_WAS_NOT_FOUND:
            return await this.editReply(int, embedify("You haven't voted for this person before."));
        case DatabaseError.UNKNOWN:
            return await this.editReply(int, embedify("An error has occurred while removing your vote, please try again later"));
        }

        return await this.editReply(int, embedify("Successfully removed vote"));
    }

    async deleteSubmission(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contestId = int.options.get("contest_id", true).value as number;

        const contest = await getContestById(int.guild.id, contestId);

        if (!contest) {
            return await this.editReply(int, embedify("There's no contest with that id"));
        }

        if (contest.endDate.getTime() < new Date().getTime()) {
            return await this.editReply(int, embedify("This contest has expired"));
        }

        if (contest.startDate.getTime() > new Date().getTime()) {
            return await this.editReply(int, embedify("This contest hasn't started yet"));
        }

        const submission = await deleteContestSubmission(int.guild.id, contestId, int.user.id);

        if (!submission)
            return await this.editReply(int, embedify(`You don't have a submission in contest \`${contest.name}\` with ID \`${contestId}\``));

        return await this.editReply(int, embedify(`Your submission in contest \`${contest.name}\` with ID \`${contestId}\` has been successfully deleted`));
    }

    async modDeleteSubmission(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contestId = int.options.get("contest_id", true).value as number;
        const user = int.options.getUser("user", true);

        const contest = await getContestById(int.guild.id, contestId);

        if (!contest) {
            return await this.editReply(int, embedify("There's no contest with that id"));
        }

        if (contest.endDate.getTime() < new Date().getTime()) {
            return await this.editReply(int, embedify("This contest has expired"));
        }

        if (contest.startDate.getTime() > new Date().getTime()) {
            return await this.editReply(int, embedify("This contest hasn't started yet"));
        }

        const submission = await deleteContestSubmission(int.guild.id, contestId, user.id);

        if (!submission)
            return await this.editReply(int, embedify(`\`${userMention(user.id)}\` doesn't have a submission in contest: \`${contest.name}\` with ID \`${contestId}\``));

        return await this.editReply(int, embedify(`${userMention(user.id)}'s submission in contest \`${contest.name}\` with ID \`${contestId}\` has been successfully deleted`));
    }
}
