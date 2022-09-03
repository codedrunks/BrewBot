import { Member, Reminder, User } from "@prisma/client";
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
export function createNewUser(userId: string) {
    return prisma.user.upsert({
        where: {
            id: userId
        },
        update: {},
        create: {
            id: userId,
        },
    });
}

//#MARKER members

/** Gets member via ID */
export async function getMember(guildId: string, userId: string): Promise<Member | null> {
    return await prisma.member.findUnique({
        where: {
            guildId_userId: {
                guildId,
                userId,
            },
        },
    });
}

/** Remove member from the database */
export async function deleteMember(guildId: string, userId: string) {
    await prisma.member.delete({
        where: {
            guildId_userId: {
                guildId,
                userId,
            },
        },
    }).catch(); // this will be updated once prisma implements a doesNotExist thing
}

/** Add new member to the database if they do not exist already */
export function createNewMember(guildId: string, memberId: string, coins?: number) {
    return prisma.member.upsert({
        where: {
            guildId_userId: {
                userId: memberId,
                guildId,
            },
        },
        update: {},
        create: {
            userId: memberId,
            guildId,
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

//#MARKER warnings

export function getWarnings(guildId: string, userId: string)
{
    return prisma.warning.findMany({
        where: {
            Member: {
                guildId,
            },
            userId,
        },
        orderBy: {
            warningId: "asc",
        },
    });
}

export async function addWarning(guildId: string, userId: string, warnedById: string, reason: string)
{
    const mem = await getMember(guildId, userId);

    if(!mem)
        await createNewMember(guildId, userId);

    let warningId = 1;

    const warns = await getWarnings(guildId, userId);

    if(warns && warns.length > 0)
    {
        const lastWarn = warns.sort((a, b) => a.warningId < b.warningId ? 1 : -1).at(0)!;
        warningId = lastWarn.warningId + 1;
    }

    return prisma.warning.create({
        data: {
            warningId,
            userId,
            reason,
            timestamp: new Date(),
            warnedBy: warnedById,
        },
    });
}

export function deleteWarning(userId: string, warningId: number)
{
    return prisma.warning.delete({
        where: {
            warningId_userId: {
                warningId,
                userId,
            }
        },
    });
}

export function deleteWarnings(userId: string, warningIds: number[])
{
    return prisma.warning.deleteMany({
        where: {
            userId,
            warningId: {
                in: warningIds,
            },
        },
    });
}
