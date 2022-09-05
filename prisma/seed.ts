import { prisma } from "../src/database/client";
import { contests, guildId, submissions } from "./contestData";
import { entries } from "./2048leaderboardData";

const run = async () => {
    await prepareDb();

    await Promise.all(
        contests.map(async (contest) => {
            return prisma.contest.upsert({
                where: {
                    guildId_id: {
                        guildId: contest.guildId,
                        id: contest.id
                    }
                },
                update: {},
                create: {
                    name: contest.name,
                    description: contest.description,
                    guildId: contest.guildId,
                    id: contest.id,
                    startDate: contest.startDate,
                    endDate: contest.endDate
                },
            });
        })
    );

    await Promise.all(
        submissions.map(async (submission) => {
            return prisma.contestSubmission.upsert({
                where: {
                    guildId_contestId_userId: {
                        guildId: submission.guildId,
                        contestId: submission.contestId,
                        userId: submission.userId,
                    }
                },
                update: {},
                create: {
                    guildId: submission.guildId,
                    contestId: submission.contestId,
                    userId: submission.userId,
                    content: submission.content,
                },
            });
        })
    );

    await Promise.all(
        entries.map(async (entry) => {
            return prisma.twentyFortyEightLeaderboardEntry.upsert({
                where: {
                    guildId_userId: {
                        guildId: entry.guildId,
                        userId: entry.userId,
                    },
                },
                update: {},
                create: {
                    guildId: entry.guildId,
                    userId: entry.userId,
                    score: entry.score,
                    gamesWon: entry.gamesWon,
                },
            });
        })
    );
};

run()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

async function prepareDb()
{
    const guild = await prisma.guild.findUnique({
        where: {
            id: guildId,
        },
    });

    if (!guild) {
        await prisma.guild.create({
            data: {
                id: guildId,
            },
        });

        await prisma.guildSettings.upsert({
            where: {
                guildId,
            },
            update: {
                contestChannelId: "715561909482422363"
            },
            create: {
                guildId,
                contestChannelId: "715561909482422363"
            },
        });

        return;
    }

    const hasContChan = (await prisma.guildSettings.findUnique({
        where: {
            guildId,
        },
    }))?.contestChannelId;

    !hasContChan && await prisma.guildSettings.upsert({
        where: {
            guildId,
        },
        update: {
            contestChannelId: "715561909482422363"
        },
        create: {
            guildId,
            contestChannelId: "715561909482422363"
        },
    });

    entries.map(async (entry) => {
        await prisma.member.upsert({
            where: {
                guildId_userId: {
                    guildId: entry.guildId,
                    userId: entry.userId,
                }
            },
            update: {},
            create: {
                guildId: entry.guildId,
                userId: entry.userId,
            },
        });
    });
}
