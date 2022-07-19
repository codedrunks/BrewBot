import { prisma } from "@database/client";
import { getRedis } from "@src/redis";
import { nowInSeconds } from "@src/util";

const redis = getRedis();

/** get coins from a user */
export async function getCoins(userId: string, guildId: string): Promise<number | undefined> {
    const checkRedis = await redis.get(`coins_${guildId}${userId}`);

    if(!checkRedis) {
        const amount = await prisma.coins.findUnique({
            where: {
                guildId_userId: {
                    guildId,
                    userId
                }
            },
            select: {
                amount: true
            }
        });

        if(amount?.amount) await redis.set(`coins_${guildId}${userId}`, amount.amount, { "EX": 300 });

        return amount?.amount;
    } else return parseInt(checkRedis);
}

/** Set coins to x amount */
export async function setCoins(userId: string, guildId: string, coins: number) {
    await prisma.coins.upsert({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        create: {
            amount: coins,
            guildId,
            userId
        },
        update: {
            amount: coins
        }
    });

    await redis.set(`coins_${guildId}${userId}`, coins, { "EX": 300 });
}

/** Increment user coin amount by x amount */
export async function addCoins(userId: string, guildId: string, coins: number) {
    const checkRedis = await redis.get(`coins_${guildId}${userId}`);

    if(checkRedis) await redis.set(`coins_${guildId}${userId}`, coins + parseInt(checkRedis), { "EX": 300 });

    await prisma.coins.upsert({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        update: {
            amount: { increment: coins }
        },
        create: {
            amount: coins,
            guildId,
            userId
        }
    });
}

/** Decrement user coin amount by x amount, use subCoinsSafe for non-zero op */
export async function subCoins(userId: string, guildId: string, coins: number) {
    await prisma.coins.update({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        data: {
            amount: {
                decrement: coins
            }
        }
    });
}

/** Decrement user coin amount without going to a negative value */
export async function subCoinsSafe(userId: string, guildId: string, coins: number) {
    const currentCoinAmount = await getCoins(userId, guildId);

    if(!currentCoinAmount) return;

    if(coins > currentCoinAmount) coins = currentCoinAmount;

    await prisma.coins.update({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        data: {
            amount: { decrement: coins }
        }
    });
}

/** Gets last daily timestamp */
export async function getLastDaily(userId: string, guildId: string): Promise<number | null | undefined> {
    const lastDaily = await prisma.bonus.findUnique({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        select: {
            lastdaily: true
        }
    });

    return lastDaily?.lastdaily;
}

/** Sets last daily timestamp */
export async function setLastDaily(userId: string, guildId: string) {
    await prisma.bonus.upsert({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        create: {
            userId,
            guildId,
            lastdaily: nowInSeconds()
        },
        update: {
            lastdaily: nowInSeconds()
        }
    });
}

/** Gets last work timestamp */
export async function getLastWork(userId: string, guildId: string): Promise<number | null | undefined> {
    const lastWork = await prisma.bonus.findUnique({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        select: {
            lastwork: true
        }
    });

    return lastWork?.lastwork;
}

/** Sets last work timestamp */
export async function setLastWork(userId: string, guildId: string) {
    await prisma.bonus.upsert({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        create: {
            userId,
            guildId,
            lastwork: nowInSeconds()
        },
        update: {
            lastwork: nowInSeconds()
        }
    });
}

/** Get total amount of times a user has worked */
export async function getTotalWorks(userId: string, guildId: string): Promise<number | null | undefined> {
    const totalworks = await prisma.bonus.findUnique({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        select: {
            totalworks: true
        }
    });

    return totalworks?.totalworks;
}

/** Add to the total amount of times a user has worked */
export async function incrementTotalWorks(userId: string, guildId: string, by?: number) {
    await prisma.bonus.update({
        where: {
            guildId_userId: {
                guildId,
                userId
            }
        },
        data: {
            totalworks: { increment: by ?? 1 }
        }
    });
}
