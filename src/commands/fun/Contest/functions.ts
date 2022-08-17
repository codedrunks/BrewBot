import { hyperlink, roleMention, time, userMention } from "@discordjs/builders";
import { Contest, ContestSubmission, Guild, GuildSettings } from "@prisma/client";
import { checkContestTimes, getContestWinners } from "@database/contest";
import { settings } from "@src/settings";
import { Client, MessageEmbed, TextBasedChannel } from "discord.js";
import { getGuildSettings, getMultipleGuildSettings } from "@src/database/guild";

export async function doContestStuff(cl: Client) {
    console.log("checking contest stuff");
    const { starting, ending } = await checkContestTimes();

    const allGuildSettings = await getMultipleGuildSettings(starting.map(c => c.guildId));

    const getStarting = (st: (Contest & { guild: Guild })[]) =>
        st.map(c => ({
            ...c,
            guildSettings: allGuildSettings.find(gs => gs.guildId === c.guildId),
        }));

    runStartingContestsJobs(cl, getStarting(starting));
    runEndingContestsJobs(cl, ending);

    setInterval(async () => {
        console.log("checking contest stuff");
        const { starting, ending } = await checkContestTimes();

        runStartingContestsJobs(cl, getStarting(starting));
        runEndingContestsJobs(cl, ending);
    }, 3600000);
}

async function runStartingContestsJobs(cl: Client, starting: (Contest & { guild: Guild, guildSettings?: GuildSettings })[]) {
    for await(const contest of starting) {
        console.log("getting ready to start contest: " + contest.id);
        const timeTillStart = contest.startDate.getTime() - new Date().getTime();

        const description = `${contest.description}\n\n\n\nuse \`/contest submit ${contest.id}\` to submit your entry\n\n24 hour voting period will start after the deadline`;

        const embed = new MessageEmbed()
            .setAuthor({ name: "Contest Started!" })
            .setTitle(contest.name)
            .setDescription(description)
            .setColor(settings.embedColors.default)
            .addField("Start", time(contest.startDate), true)
            .addField("End", time(contest.endDate), true)
            .setFooter({ text: `Contest ID: ${contest.id}` });

        const guildSettings = await getGuildSettings(contest.guild.id);

        if(!guildSettings)
            return; // TODO: error msg?

        setTimeout(async () => {
            await (cl.channels.cache.find(channel => channel.id === guildSettings.contestChannelId) as TextBasedChannel).send({
                content: roleMention(guildSettings.contestRoleId ?? "New Contest"),
                embeds: [embed]
            });
        }, timeTillStart);
    }
}

async function runEndingContestsJobs(cl: Client, ending: (Contest & { guild: Guild, submissions: ContestSubmission[] })[]) {
    for await(const contest of ending) {
        console.log("getting ready to end contest: " + contest.id);
        const timeTillEnd = contest.endDate.getTime() - new Date().getTime();

        const votingEnd = new Date(contest.endDate.setDate(contest.endDate.getDate() + 1));
        const description = `${contest.description}\n\nYou have 24 hours to vote. You can vote with \`/contest vote\`\nVoting will end at ${time(votingEnd)}`;

        let submissions = "";

        if (!contest.submissions.length) {
            submissions = "No submissions :(";
        }

        contest.submissions.forEach(submission => {
            const user = cl.guilds.cache.get(submission.guildId)?.members.cache.get(submission.userId)?.user;

            const link = hyperlink(user?.username ?? userMention(submission.userId), submission.content);

            submissions += `- ${link}\n`;
        });


        const votingEmbed = new MessageEmbed()
            .setAuthor({ name: "Voting Time!" })
            .setTitle(contest.name)
            .setDescription(description)
            .setColor(settings.embedColors.default)
            .addField("Submissions", submissions)
            .setFooter({ text: `Contest ID: ${contest.id}` });

        const guildSettings = await getGuildSettings(contest.guild.id);

        if(!guildSettings)
            return; // TODO: error msg?

        setTimeout(async () => {
            await (cl.channels.cache.find(channel => channel.id === guildSettings.contestChannelId) as TextBasedChannel).send({
                content: roleMention(guildSettings.contestRoleId ?? "Voting Started"),
                embeds: [votingEmbed]
            });
        }, timeTillEnd);

        setTimeout(async () => {
            const winners = await getContestWinners(contest.guildId, contest.id);

            const authorText = winners.length ? "We have a winner!" : "We have no winners :(";

            let winnersResult = "";

            if (!winners.length) {
                winnersResult = "No winners";
            }

            const first = [];
            const second = [];
            const third = [];

            let pos = 1;

            for (let i = 0; i < winners.length; i++) {
                if (i === 0) {
                    first.push(winners[i]);
                    continue;
                }

                if (pos === 4) {
                    break;
                }

                switch (pos) {
                case 1:
                    if (winners[i]._count.votes === first[first.length - 1]._count.votes) {
                        first.push(winners[i]);
                    } else {
                        second.push(winners[i]);
                        pos++;
                    }
                    break;
                case 2:
                    if (winners[i]._count.votes === second[second.length - 1]._count.votes) {
                        second.push(winners[i]);
                    } else {
                        third.push(winners[i]);
                        pos++;
                    }
                    break;
                case 3:
                    if (winners[i]._count.votes === third[third.length - 1]._count.votes) {
                        third.push(winners[i]);
                    } else {
                        pos++;
                    }
                    break;
                }
            }

            if (first.length) {
                winnersResult += "1st: ";
                first.forEach(winner => {
                    winnersResult += hyperlink(userMention(winner.userId), winner.content);
                });
                winnersResult += ` (${first[0]._count.votes})\n`;
            }

            if (second.length) {
                winnersResult += "2nd: ";
                second.forEach(winner => {
                    winnersResult += hyperlink(userMention(winner.userId), winner.content);
                });
                winnersResult += ` (${second[0]._count.votes})\n`;
            }

            if (third.length) {
                winnersResult += "3rd: ";
                third.forEach(winner => {
                    winnersResult += hyperlink(userMention(winner.userId), winner.content);
                });
                winnersResult += ` (${third[0]._count.votes})`;
            }

            const winnerEmbed = new MessageEmbed()
                .setAuthor({ name: authorText })
                .setTitle(contest.name)
                .setDescription(contest.description)
                .setColor(settings.embedColors.contestWinner)
                .addField("Result", winnersResult)
                .setFooter({ text: `Contest ID: ${contest.id}` });

            await (cl.channels.cache.find(channel => channel.id === guildSettings.contestChannelId) as TextBasedChannel).send({
                content: roleMention(guildSettings.contestRoleId ?? "Winner Announcement"),
                embeds: [winnerEmbed],
            });
        }, 24 * 3600 * 1000);
    }
}
