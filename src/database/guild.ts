import { prisma } from "@database/client";
import { Guild, GuildSettings } from "@prisma/client";

//#MARKER guild

/** Creates a new guild by ID */
export async function createGuild(guildId: string)
{
    return setGuild(guildId, {
        id: guildId,
        lastLogColor: null,
        premium: false,
    });
}

/** Creates or overrides a guild by ID */
export function setGuild(guildId: string, guildObj: Guild)
{
    return prisma.guild.upsert({
        where: {
            id: guildId,
        },
        create: guildObj,
        update: guildObj,
    });
}

export function getGuild(guildId: string)
{
    return prisma.guild.findUnique({
        where: {
            id: guildId,
        },
    });
}

export function deleteGuild(guildId: string)
{
    return prisma.guild.delete({
        where: {
            id: guildId,
        },
    });
}

//#MARKER guild settings

export function createGuildSettings(guildId: string)
{
    const defaultGS = {
        guildId,
        djOnly: false,
    };

    return prisma.guildSettings.upsert({
        where: {
            guildId,
        },
        create: defaultGS,
        update: {},
    });
}

export function setGuildSettings(guildId: string, settings: GuildSettings)
{
    return prisma.guildSettings.upsert({
        where: {
            guildId,
        },
        create: settings,
        update: settings,
    });
}

export function getGuildSettings(guildId: string)
{
    return prisma.guildSettings.findUnique({
        where: {
            guildId,
        },
    });
}

export function getMultipleGuildSettings(guildIds: string[])
{
    if(guildIds.length === 0)
        return [];

    return prisma.guildSettings.findMany({
        where: {
            guildId: {
                in: guildIds,
            },
        },
    });
}
