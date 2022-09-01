import { Collection, Role } from "discord.js";
import { prisma } from "@database/client";
import { getRedis } from "@src/redis";

const redis = getRedis();

export async function setPremium(guildId: string, set: boolean) {
    await redis.set(`premium_${guildId}`, `${set}`, { "EX": 300 });

    await prisma.guild.upsert({
        where: {
            id: guildId
        },
        create: {
            id: guildId,
            premium: set
        },
        update: {
            premium: set
        }
    });
}

export async function getPremium(guildId: string): Promise<boolean> {
    const redisCheck = await redis.get(`premium_${guildId}`);

    if(!redisCheck) {
        const premium = await prisma.guild.findFirst({
            where: {
                id: guildId
            },
            select: {
                premium: true,
            },
        });

        return premium?.premium ?? false;
    }
    else return redisCheck === "true";
}

export async function togglePremium(guildId: string): Promise<boolean> {
    const c = await getPremium(guildId);

    await redis.set(`premium_${guildId}`, `${!c}`, { "EX": 300 });

    await prisma.guild.upsert({
        where: {
            id: guildId
        },
        update: {
            premium: !c
        },
        create: {
            id: guildId,
            premium: false
        }
    });

    return !c;
}

export async function addDJRoleId(guildId: string, roleId: string) {
    const redisCheck = await redis.hGetAll(`dj_${guildId}`);

    let temp: string[] = [roleId];

    if(redisCheck.ids) temp = temp.concat(redisCheck.ids.split(","));

    if(!temp.includes(roleId)) {
        await redis.hSet(`dj_${guildId}`, "ids", temp.join(","));
        await redis.expire(`dj_${guildId}`, 300);
    }

    await prisma.guildSettings.upsert({
        where: {
            guildId,
        },
        update: {
            djRoleIds: {
                push: roleId,
            },
        },
        create: {
            guildId,
            djRoleIds: [roleId],
        },
    });
}

export async function getDJOnly(guildId: string): Promise<boolean> {
    const redisCheck = await redis.hGetAll(`dj_${guildId}`);

    if(!redisCheck.djonly || !redisCheck.ids) {
        const i = await prisma.guildSettings.findFirst({
            where: {
                guildId,
            },
            select: {
                djOnly: true,
                djRoleIds: true
            }
        });

        if(i?.djOnly) {
            await redis.hSet(`dj_${guildId}`, "djonly", `${i.djOnly}`);
            await redis.expire(`dj_${guildId}`, 300);
        }
        if(i?.djRoleIds && i?.djRoleIds.length > 0) await redis.hSet(`dj_${guildId}`, "ids", `${i.djRoleIds.join(",")}`);

        return (i?.djOnly && i?.djRoleIds.length > 0) ?? false;
    } else return (redisCheck.djonly === "true" && redisCheck.ids != undefined || redisCheck.ids != "" && redisCheck.ids.split(",").length > 0);
}

export async function toggleDJOnly(guildId: string): Promise<boolean> {
    const c = await getDJOnly(guildId);

    await redis.hSet(`dj_${guildId}`, "djonly", `${!c}`);
    await redis.expire(`dj_${guildId}`, 300);

    await prisma.guildSettings.upsert({
        where: {
            guildId,
        },
        update: {
            djOnly: !c,
        },
        create: {
            guildId,
            djOnly: false,
        },
    });

    return !c;
}

export async function getDJRoleIds(guildId: string): Promise<Array<string>> {
    const redisCheck = await redis.hGetAll(`dj_${guildId}`);

    if(!redisCheck.ids) {
        const i = await prisma.guildSettings.findFirst({
            where: {
                guildId,
            },
            select: {
                djRoleIds: true,
            },
        });

        return i?.djRoleIds ?? [];
    } else return redisCheck.ids ? redisCheck.ids.split(",") : [];
}

export async function removeDJRoleId(guildId: string, roleId: string): Promise<boolean | void> {
    const ids = await getDJRoleIds(guildId);

    const newIds = ids.filter((v) => v != roleId);

    if(ids.length == newIds.length) return true;

    await redis.hSet(`dj_${guildId}`, "ids", newIds.join(","));
    await redis.expire(`dj_${guildId}`, 300);

    await prisma.guildSettings.update({
        where: {
            guildId,
        },
        data: {
            djRoleIds: newIds,
        },
    });
}

export async function isDJRole(guildId: string, roleId: string): Promise<boolean> {
    const redisCheck = (await redis.hGetAll(`dj_${guildId}`)).ids.split(",");
    const roles = redisCheck.length > 0 ? redisCheck : await getDJRoleIds(guildId);

    if(roles.includes(roleId)) return true;

    return false;
}

export async function isDJOnlyandhasDJRole(guildId: string, roleIds: Collection<string, Role>): Promise<boolean> {

    const redisCheck = await redis.hGetAll(`dj_${guildId}`);

    const djOnly = redisCheck.djonly === "true" || await getDJOnly(guildId);
    const djRoles = redisCheck.ids && redisCheck.ids.split(",").length > 0 ? redisCheck.ids.split(",") : await getDJRoleIds(guildId);

    if(djOnly && !roleIds.some(v => djRoles.includes(v.id))) return true;

    return false;
}
