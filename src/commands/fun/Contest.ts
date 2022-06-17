import { settings } from "../../settings";
import { CommandInteraction, CommandInteractionOption, MessageEmbed } from "discord.js";
import { Command } from "../../Command";
import { deleteContestSubmission, getAllContestsInGuild, getContestById, getCurrentContest, getSubmissionsOfContest, setContestChannel, setContestRole, submitContestEntry } from "../../database/contest";
import { embedify } from "../../util";
import { bold, channelMention, hyperlink, userMention, inlineCode, roleMention, strikethrough, time, underscore } from "@discordjs/builders";
import { ContestModal } from "../../modals/contest";

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
                },
                {
                    name: "get_current",
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
                            type: "number",
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
                            type: "number",
                            required: true,
                        },
                        {
                            name: "user",
                            desc: "User you want to delete the submission of",
                            type: "user",
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
        if (opt.name != "start")
            await this.deferReply(int);

        switch(opt.name)
        {
        case "start":
            return await this.start(int);
        case "get_current":
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
        case "delete_submission":
            return await this.deleteSubmission(int);
        case "mod_delete_submission":
            return await this.modDeleteSubmission(int);
        }
    }

    async start(int: CommandInteraction) {
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

        const embedDesc = `${contest.description}\n\nuse\`/contest submit ${contest.id}\` to submit your entry\n\n24 hour voting period will start after the deadline`;

        const embed = new MessageEmbed()
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
                followUpDesc += `- ${linkifiedUsername}\n`;
            });

            const submissionsEmbed = new MessageEmbed()
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

        const contestId = int.options.getNumber("contest_id", true);

        const contest = await getContestById(int.guild.id, contestId);

        if (!contest) {
            return await this.editReply(int, embedify("There's no contest with that id"));
        }

        const didContestEnd = new Date().getTime() >= contest.endDate.getTime();

        const field1Name = didContestEnd ? "Started" : "Start";
        const field2Name = didContestEnd ? "Ended" : "End";

        const embedDesc = didContestEnd ? contest.description : `${contest.description}\n\nuse\`/contest submit ${contest.id}\` to submit your entry\n\n24 hour voting period will start after the deadline`;

        const embed = new MessageEmbed()
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
            let followUpDesc = "Click on the names to see the submission\n\n";

            submissions.forEach(submission => {
                const guildMember = int.guild?.members.cache.find(user => user.id === submission.userId);
                const linkifiedUsername = hyperlink(guildMember?.user?.username ?? "User", submission.content);
                followUpDesc += `- ${linkifiedUsername}\n`;
            });

            const submissionsEmbed = new MessageEmbed()
                .setTitle("Submissions")
                .setDescription(followUpDesc)
                .setColor(settings.embedColors.default);
            embeds.push(submissionsEmbed);
        }

        return await this.editReply(int, embeds);
    }

    async list(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contests = await getAllContestsInGuild(int.guild.id);

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

        const embed = new MessageEmbed()
            .setTitle("Contests")
            .setColor(settings.embedColors.default)
            .setDescription(embedDesc);

        return await this.editReply(int, embed);
    }

    async setChannel(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const chan = int.options.getChannel("channel", true);
        const success = await setContestChannel(int.guild.id, chan.id);

        if (!success)
            return await this.editReply(int, embedify("An error has occurred while setting channel. please try again later"));
        else
            return await this.editReply(int, embedify(`Successfully set the contests channel to ${channelMention(chan.id)}`));
    }

    async setRole(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const role = int.options.getRole("role", true);
        const success = await setContestRole(int.guild.id, role.id);

        if (!success)
            return await this.editReply(int, embedify("An error has occurred while setting role. please try again later"));
        else
            return await this.editReply(int, embedify(`Successfully set the contests role to ${roleMention(role.id)}`));
    }

    async submit(int: CommandInteraction) {
        if (!int.guild?.id || !int.channel?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contestId = int.options.getNumber("contest_id", true);
        const attachment = int.options.getAttachment("attachment", true);

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

        const success = await submitContestEntry(int.guild.id, contestId, int.user.id, submissionLink);

        if (!success)
            return await this.followUpReply(int, embedify("An error has occurred while submitting your entry, please try again"));

        return await this.followUpReply(int, embedify("Successfully submitted your entry!"));
    }

    async deleteSubmission(int: CommandInteraction) {
        if (!int.guild?.id) return await this.editReply(int, embedify("This command cannot be used in DMs"));

        const contestId = int.options.getNumber("contest_id", true);

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

        const contestId = int.options.getNumber("contest_id", true);
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
