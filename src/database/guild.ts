import { prisma } from "@database/client";
import { GuildSettings } from "@prisma/client";

//#MARKER guild

export function createGuild(guildId: string)
{
    return prisma.guild.create({
        data: {
            id: guildId,
            premium: false,
        },
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
