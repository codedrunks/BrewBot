import { Contest, ContestSubmission } from "@prisma/client";
import { prisma } from "./client";

export async function setContestChannel(guildId: string, channelId: string): Promise<boolean> {
    await prisma.guild.upsert({
        where: {
            id: guildId
        },
        update: {
            contestChannelId: channelId
        },
        create: {
            id: guildId,
            contestChannelId: channelId
        }
    }).catch(() => {
        return false;
    });

    return true;
}

export async function setContestRole(guildId: string, roleId: string): Promise<boolean> {
    await prisma.guild.upsert({
        where: {
            id: guildId
        },
        update: {
            contestRoleId: roleId
        },
        create: {
            id: guildId,
            contestRoleId: roleId
        }
    }).catch(() => {
        return false;
    });

    return true;
}

export async function getAllContestsInGuild(guildId: string): Promise<Contest[]> {
    const contests = await prisma.contest.findMany({
        where: {
            guildId: guildId,
        }
    });

    return contests;
}

export async function startContest(name: string, description: string, start_date: string, end_date: string): Promise<void> {
    // TODO:
}

export async function getCurrentContest(guildId: string): Promise<Contest | null> {
    const contest = await prisma.contest.findFirst({
        where: {
            guildId: guildId,
            startDate: {
                lt: new Date(),
            },
            endDate: {
                gt: new Date(),
            },
        },
        orderBy: {
            id: "desc"
        }
    });

    return contest;
}

export async function getContestById(guildId: string, contestId: number): Promise<Contest | null> {
    const contest = await prisma.contest.findUnique({
        where: {
            guildId_id: {
                guildId: guildId,
                id: contestId,
            }
        }
    });

    return contest;
}

export async function getSubmissionsOfContest(guildId: string, contestId: number): Promise<ContestSubmission[]> {
    const submissions = await prisma.contestSubmission.findMany({
        where: {
            guildId: guildId,
            contestId: contestId
        },
    });

    return submissions;
}

export async function submitContestEntry(guildId: string, contestId: number, userId: string, submissionLink: string): Promise<boolean> {
    await prisma.contestSubmission.upsert({
        where: {
            guildId_contestId_userId: {
                guildId: guildId,
                contestId: contestId,
                userId: userId
            },
        },
        update: {
            content: submissionLink,
        },
        create: {
            guildId: guildId,
            contestId: contestId,
            userId: userId,
            content: submissionLink,
        }
    }).catch(() => {
        return false;
    });

    return true;
}

export async function deleteContestSubmission(guildId: string, contestId: number, userId: string): Promise<ContestSubmission | null> {
    const submission = await prisma.contestSubmission.delete({
        where: {
            guildId_contestId_userId: {
                guildId: guildId,
                contestId: contestId,
                userId: userId
            }
        }
    }).catch(() => {
        return null;
    });

    return submission;
}

