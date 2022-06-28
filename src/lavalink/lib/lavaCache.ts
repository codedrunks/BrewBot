import { prisma } from "@database/client";

export interface Cache {
    [guildId: string]: {
        djOnly: boolean,
        djRoleIds?: string[]
    }
}

export const lavaCache: Cache = {};

export function isGuildCached(id: string): boolean {
    return lavaCache[id] !== null;
}

export function addDJRoleToDB(id: string, roleId: string | string[]) {
    lavaCache[id] = {
        djOnly: false,
        djRoleIds: typeof roleId == "string" ? [ roleId ] : roleId
    };
}
