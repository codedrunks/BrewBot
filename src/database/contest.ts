import { Contest } from "@prisma/client";
import { prisma } from "./client";

export async function setContestChannel(): Promise<void> {
}

export async function setContestRole(): Promise<void> {
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
}

export async function getCurrentContest(guildId: string): Promise<Contest | null> {
    const contest = await prisma.contest.findUnique({
        where: {
            guildId_id: {
                guildId: guildId,
                // TODO: change this.
                id: 1,
            }
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

export async function submitContestEntry(contestId: number): Promise<void> {
}

export async function deleteContestSubmission(contestId: number, entryId: string): Promise<void> {
}

export async function startContestVote(contestId: number): Promise<void> {
}

