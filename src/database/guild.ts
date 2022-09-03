import { prisma } from "@database/client";
import { Guild, GuildSettings } from "@prisma/client";

//#MARKER guild

/** Creates a new guild by ID */
export function createNewGuild(guildId: string)
{
    return prisma.guild.create({
        data: {
            id: guildId,
            lastLogColor: null,
            premium: false,
        },
    });
}

/** Creates or overrides a guild by ID */
export function setGuild(guildObj: Guild)
{
    return prisma.guild.upsert({
        where: {
            id: guildObj.id,
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
