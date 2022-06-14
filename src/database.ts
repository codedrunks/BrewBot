import { PrismaClient, User } from "@prisma/client";

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

/** Increment user coin amount by x amount */
export async function addCoins(userId: string, coins: number) {
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            coins: { increment: coins }
        }
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