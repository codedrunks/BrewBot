import { Collection, Role } from "discord.js";
import { prisma } from "./client";

export async function addDJRoleId(guildId: string, roleId: string) {
    await prisma.guild.upsert({
        where: {
            id: guildId
        },
        update: {
            djRoleIds: {
                push: roleId
            }
        },
        create: {
            id: guildId,
            djRoleIds: [roleId]
        }
    });
}

export async function getDJOnly(guildId: string): Promise<boolean> {
    const i = await prisma.guild.findFirst({
        where: {
            id: guildId
        },
        select: {
            djOnly: true,
            djRoleIds: true
        }
    });

    return (i?.djOnly && i?.djRoleIds.length > 0) ?? false;
}

export async function toggleDJOnly(guildId: string): Promise<boolean> {
    const c = await getDJOnly(guildId);

    await prisma.guild.upsert({
        where: {
            id: guildId
        },
        update: {
            djOnly: !c
        },
        create: {
            id: guildId,
            djOnly: false,
        }
    });

    return !c;
}

export async function getDJRoleIds(guildId: string): Promise<Array<string>> {
    const i = await prisma.guild.findFirst({
        where: {
            id: guildId
        },
        select: {
            djRoleIds: true
        }
    });

    return i?.djRoleIds ?? [];
}

export async function removeDJRoleId(guildId: string, roleId: string): Promise<boolean | void> {
    const ids = await getDJRoleIds(guildId);

    const newIds = ids.filter((v) => v != roleId);

    if(ids.length == newIds.length) return true;

    await prisma.guild.update({
        where: {
            id: guildId
        },
        data: {
            djRoleIds: newIds
        }
    });
}

export async function isDJRole(guildId: string, roleId: string): Promise<boolean> {
    const roles = await getDJRoleIds(guildId);

    if(roles.includes(roleId)) return true;

    return false;
}

export async function isDJOnlyandhasDJRole(guildId: string, roleIds: Collection<string, Role>): Promise<boolean> {
    const djOnly = await getDJOnly(guildId);
    const djRoles = await getDJRoleIds(guildId);

    if(djOnly && !roleIds.some(v => djRoles.includes(v.id))) return true;

    return false;
}
