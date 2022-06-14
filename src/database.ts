import { PrismaClient, User } from "@prisma/client";
import { nowInSeconds } from "./util";

let prisma: PrismaClient = new PrismaClient();

/** Gets user via ID */
export async function getUser(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });

    return user;
}

/** Remove user from the database */
export async function deleteUser(userId: string) {
    await prisma.user.delete({
        where: {
            id: userId
        }
    });
}

/** Add new user to the database if they do not exist already */
export async function createNewUser(userId: string) {
    await prisma.user.upsert({
        where: {
            id: userId
        },
        update: {},
        create: {
            id: userId,
            coins: 0
        }
    });
}

/** Add new user if they do not exist, and give them a balance */
export async function createNewUserWithCoins(userId: string, coins: number) {
    await prisma.user.upsert({
        where: {
            id: userId
        },
        update: {
            coins: coins
        },
        create: {
            id: userId,
            coins: coins
        }
    });
}

/** get coins from a user */
export async function getCoins(userId: string): Promise<number | undefined> {
    let coins = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            coins: true
        }
    });

    return coins?.coins;
}

/** Set coins to x amount */
export async function setCoins(userId: string, coins: number) {
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            coins: coins
        }
    });
}

/** Increment user coin amount by x amount */
export async function addCoins(userId: string, coins: number) {
    await prisma.user.upsert({
        where: {
            id: userId
        },
        update: {
            coins: { increment: coins }
        },
        create: {
            id: userId,
            coins: coins
        }
        // data: {
        //     coins: { increment: coins }
        // }
    });
}

/** Decrement user coin amount by x amount, use subCoinsSafe for non-zero op */
export async function subCoins(userId: string, coins: number) {
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            coins: { decrement: coins }
        }
    });
}

/** Decrement user coin amount without going to a negative value */
export async function subCoinsSafe(userId: string, coins: number) {
    let currentCoinAmount = await getCoins(userId);

    if(!currentCoinAmount) return;

    if(coins > currentCoinAmount) coins = currentCoinAmount;

    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            coins: { decrement: coins }
        }
    });
}

export async function getLastDaily(userId: string): Promise<number | null | undefined> {
    let lastDaily = await prisma.bonus.findUnique({
        where: {
            userId
        },
        select: {
            lastdaily: true
        }
    });

    return lastDaily?.lastdaily;
}

export async function setLastDaily(userId: string) {
    await prisma.bonus.upsert({
        where: {
            userId
        },
        create: {
            userId,
            lastdaily: nowInSeconds()
        },
        update: {
            lastdaily: nowInSeconds()
        }
    });
}

export async function getLastWork(userId: string): Promise<number | null | undefined> {
    let lastWork = await prisma.bonus.findUnique({
        where: {
            userId
        },
        select: {
            lastwork: true
        }
    });

    return lastWork?.lastwork;
}

export async function setLastWork(userId: string) {
    await prisma.bonus.upsert({
        where: {
            userId
        },
        create: {
            userId,
            lastwork: nowInSeconds()
        },
        update: {
            lastwork: nowInSeconds()
        }
    });
}

export async function getTotalWorks(userId: string): Promise<number | null | undefined> {
    let totalworks = await prisma.bonus.findUnique({
        where: {
            userId
        },
        select: {
            totalworks: true
        }
    });

    return totalworks?.totalworks;
}

export async function incrementTotalWorks(userId: string, by?: number) {
    await prisma.bonus.update({
        where: {
            userId
        },
        data: {
            totalworks: { increment: by ?? 1 }
        }
    });
}