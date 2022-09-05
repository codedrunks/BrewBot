import { TwentyFortyEightLeaderboardEntry } from "@prisma/client";
import { prisma } from "@database/client";
import { DatabaseError } from "@database/util";

export async function getLeaderboard(guildId: string, global: boolean, sort: string, orderBy: string): Promise<TwentyFortyEightLeaderboardEntry[]> {
    if (global) {
        const entries = await prisma.twentyFortyEightLeaderboardEntry.findMany({
            orderBy: {
                [sort]: orderBy,
            },
            take: 500,
        });

        return entries;
    }

    const entries = await prisma.twentyFortyEightLeaderboardEntry.findMany({
        where: {
            guildId,
        },
        orderBy: {
            [sort]: orderBy,
        }
    });

    return entries;
}

export async function addOrUpdateLeaderboardEntry(guildId: string, userId: string, score: number, isGameWin: boolean): Promise<DatabaseError> {
    const gamesWon = isGameWin ? 1 : 0;

    await prisma.twentyFortyEightLeaderboardEntry.upsert({
        where: {
            guildId_userId: {
                guildId,
                userId
            },
        },
        update: {
            score,
            gamesWon: {
                increment: gamesWon,
            }
        },
        create: {
            guildId,
            userId,
            score,
            gamesWon,
        },
    }).catch((err) => {
        console.error(`Error while adding or updating a 2048 leaderboard entry: ${err}`);
        return DatabaseError.UNKNOWN;
    });

    return DatabaseError.SUCCESS;
}

