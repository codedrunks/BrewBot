import { prisma } from "../src/database/client";
import { contests, submissions } from "./contestData";

const run = async () => {
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
};

run()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
