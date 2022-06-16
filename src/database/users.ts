import { User } from "@prisma/client";
import { prisma } from "./client";


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
    }).catch(); // this will be updated once prisma implements a doesNotExist thing
}

/** Add new user to the database if they do not exist already */
export async function createNewUser(userId: string, guildId: string) {
    await prisma.user.upsert({
        where: {
            id: userId
        },
        update: {},
        create: {
            id: userId,
            coins: {
                create: {
                    guildId,
                    amount: 0
                }
            },
            bonus: {
                create: {
                    guildId,
                }
            }
        },
    });
}

/** Add new user if they do not exist, and give them a balance */
export async function createNewUserWithCoins(userId: string, guildId: string, coins: number) {
    await prisma.user.upsert({
        where: {
            id: userId
        },
        update: {},
        create: {
            id: userId,
            coins: {
                create: {
                    amount: coins,
                    guildId,
                }
            }
        }
    });
}