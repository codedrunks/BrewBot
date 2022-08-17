import { Reminder, User } from "@prisma/client";
import { prisma } from "@database/client";

//#MARKER users

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

//#MARKER reminders

/** Gets all reminders via user ID */
export async function getReminders(userId: string): Promise<Reminder[] | null> {
    return await prisma.reminder.findMany({
        where: {
            userId,
        },
        orderBy: {
            dueTimestamp: "asc",
        },
    });
}

/** Gets a specific reminder via its ID */
export async function getReminder(reminderId: number, userId: string): Promise<Reminder | null> {
    return await prisma.reminder.findUnique({
        where: {
            reminderId_userId: {
                reminderId,
                userId,
            },
        },
    });
}

/** Gets all expired reminders */
export async function getExpiredReminders(): Promise<Reminder[] | null> {
    return await prisma.reminder.findMany({
        where: {
            dueTimestamp: {
                lt: new Date(),
            },
        },
        orderBy: {
            dueTimestamp: "asc",
        },
    });
}

/** Adds or updates a reminder */
export async function setReminder(rem: Reminder): Promise<void>
{
    await prisma.reminder.upsert({
        where: {
            reminderId_userId: {
                reminderId: rem.reminderId,
                userId: rem.userId,
            }
        },
        update: {
            ...rem,
        },
        create: {
            ...rem,
        },
    });
}

/** Deletes one reminder by its ID */
export async function deleteReminder(reminderId: number, userId: string): Promise<void>
{
    await deleteReminders([reminderId], userId);
}

/** Deletes multiple reminders by their ID */
export async function deleteReminders(reminderIds: number[], userId: string): Promise<void>
{
    await prisma.reminder.deleteMany({
        where: {
            reminderId: {
                in: reminderIds,
            },
            userId: {
                in: userId,
            }
        },
    });
}
