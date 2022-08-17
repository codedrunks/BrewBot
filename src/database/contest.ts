import { Contest, ContestSubmission, Guild, Prisma } from "@prisma/client";
import { prisma } from "@database/client";
import { DatabaseError } from "@database/util";

export async function setContestChannel(guildId: string, channelId: string): Promise<DatabaseError> {
    try {
        await prisma.guildSettings.upsert({
            where: {
                guildId,
            },
            update: {
                contestChannelId: channelId,
            },
            create: {
                guildId,
                contestChannelId: channelId,
            },
        });
    } catch (e) {
        console.error(e);
        return DatabaseError.UNKNOWN;
    }

    return DatabaseError.SUCCESS;
}

export async function setContestRole(guildId: string, roleId: string): Promise<DatabaseError> {
    try {
        await prisma.guildSettings.upsert({
            where: {
                guildId,
            },
            update: {
                contestRoleId: roleId,
            },
            create: {
                guildId,
                contestRoleId: roleId,
            },
        });
    } catch (e) {
        console.error(e);
        return DatabaseError.UNKNOWN;
    }

    return DatabaseError.SUCCESS;
}

export async function getAllContestsInGuild(guildId: string): Promise<Contest[]> {
    const contests = await prisma.contest.findMany({
        where: {
            guildId: guildId,
        },
        orderBy: {
            id: "asc"
        }
    });

    return contests;
}

export async function addContest(guildId: string, name: string, description: string, startDateISO: string, endDateISO: string): Promise<DatabaseError> {
    let latestContest: Contest | null = null;
    try {
        latestContest = await prisma.contest.findFirst({
            where: {
                guildId: guildId,
            },
            orderBy: {
                id: "desc"
            }
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code !== "P2001") { // Not Found
                console.error(e);
                return DatabaseError.UNKNOWN;
            }
        }
    }

    let newId = 1;

    if (latestContest) {
        newId = latestContest.id + 1;
    }

    try {
        await prisma.contest.create({
            data: {
                id: newId,
                name: name,
                description: description,
                guildId: guildId,
                startDate: startDateISO,
                endDate: endDateISO,
            }
        });
    } catch (e) {
        console.error(e);
        return DatabaseError.UNKNOWN;
    }

    return DatabaseError.SUCCESS;
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

export async function getSubmissionsOfContest(guildId: string, contestId: number): Promise<(ContestSubmission & { _count: { votes: number } })[]> {
    const submissions = await prisma.contestSubmission.findMany({
        where: {
            guildId: guildId,
            contestId: contestId
        },
        include: {
            _count: {
                select: {
                    votes: true
                }
            }
        }
    });

    return submissions;
}

export async function submitContestEntry(guildId: string, contestId: number, userId: string, submissionLink: string): Promise<DatabaseError> {
    try {
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
        });
    } catch (e) {
        console.error(e);
        return DatabaseError.UNKNOWN;
    }

    return DatabaseError.SUCCESS;
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

export type StartingContest = Contest & { guild: Guild };
export type EndingContest = Contest & { guild: Guild, submissions: ContestSubmission[] };

export async function checkContestTimes(): Promise<{ starting: StartingContest[], ending: EndingContest[] }> {
    const now = new Date();
    const nowPlusHour = new Date(now.getTime());
    nowPlusHour.setMinutes(now.getMinutes() + 1);

    const startingContests = await prisma.contest.findMany({
        where: {
            startDate: {
                gt: now.toISOString(),
                lte: nowPlusHour.toISOString()
            }
        },
        include: {
            guild: true
        }
    });

    const endingContests = await prisma.contest.findMany({
        where: {
            endDate: {
                gt: now.toISOString(),
                lte: nowPlusHour.toISOString()
            }
        },
        include: {
            guild: true,
            submissions: true
        }
    });

    return {
        starting: startingContests,
        ending: endingContests,
    };
}

export async function voteContest(guildId: string, contestId: number, contestantId: string, voterId: string): Promise<DatabaseError> {
    try {
        await prisma.submissionVote.create({
            data: {
                guildId: guildId,
                contestId: contestId,
                contestantId: contestantId,
                voterId: voterId
            }
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === "P2002") { // Unique constraint violation
                return DatabaseError.DUPLICATE;
            } else if (e.code === "P2003" && (e.meta?.field_name as string).includes("contestantId_fkey")) { // Foreign key constraint violation
                return DatabaseError.NO_CONTEST_SUBMISSION;
            }

            console.error(e);
            return DatabaseError.UNKNOWN;
        }
    }

    return DatabaseError.SUCCESS;
}

export async function unvoteContest(guildId: string, contestId: number, contestantId: string, voterId: string): Promise<DatabaseError> {
    try {
        await prisma.submissionVote.delete({
            where: {
                guildId_contestId_contestantId_voterId: {
                    guildId: guildId,
                    contestId: contestId,
                    contestantId: contestantId,
                    voterId: voterId
                }
            }
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === "P2025") { // Operation depends on required record that was not found
                return DatabaseError.OPERATION_DEPENDS_ON_REQUIRED_RECORD_THAT_WAS_NOT_FOUND;
            }
        }
        console.error(e);
        return DatabaseError.UNKNOWN;
    }

    return DatabaseError.SUCCESS;
}

export async function getContestWinners(guildId: string, contestId: number): Promise<(ContestSubmission & { _count: { votes: number } })[]> {
    const winners = await prisma.contestSubmission.findMany({
        where: {
            guildId: guildId,
            contestId: contestId
        },
        include: {
            _count: {
                select: {
                    votes: true
                }
            }
        },
        orderBy: {
            votes: {
                _count: "desc"
            }
        }
    });

    return winners;
}
