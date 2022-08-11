import { Reminder, User } from "@prisma/client";
import { prisma } from "@database/client";

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
export async function createNewUser(userId: string, guildId: string, coins?: number) {
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
                    amount: coins ?? 0
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

/** Gets all reminders via user ID */
export async function getReminders(userId: string): Promise<Reminder[] | null> {
    const reminders = await prisma.reminder.findMany({
        where: {
            userId,
        },
    });

    return reminders;
}

/** Gets a specific reminder via its ID */
export async function getReminder(reminderId: number): Promise<Reminder | null> {
    const reminder = await prisma.reminder.findFirst({
        where: {
            reminderId,
        },
    });

    return reminder;
}

/** Adds or updates a reminder */
export async function setReminder(rem: Reminder): Promise<void>
{
    await prisma.reminder.upsert({
        where: {
            reminderId: rem.reminderId,
        },
        update: {
            ...rem,
        },
        create: {
            ...rem,
        },
    });
}

/** Deletes one or multiple reminders by their ID */
export async function deleteReminder(reminderId: number | number[]): Promise<void>
{
    if(Array.isArray(reminderId))
        await prisma.reminder.deleteMany({
            where: {
                reminderId: {
                    in: reminderId,
                },
            },
        });
    else
        await prisma.reminder.delete({
            where: {
                reminderId: reminderId,
            },
        });
}
