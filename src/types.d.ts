import { ClientEvents, PermissionFlags } from "discord.js";


/** Persistent data stored in `./data.json` */
export interface PersistentData
{
    /** Timestamp of when the bot last started up */
    startupTime: number;
    /** Array of the current reaction roles message IDs */
    reactionMessages: string[];
    /** Bot logs channel */
    botLogs: {
        guild: string;
        channel: string;
    }
}

/** Keys of the persistent data object */
export type DataKey = keyof PersistentData;

/** Meta information of a Command instance */
export interface CommandMeta {
    name: string;
    desc: string;
    /** Required permission(s) to run this command */
    perms?: (keyof PermissionFlags)[];
    /** Optional array of arguments this command has */
    args?: {
        name: string;
        desc: string;
        /** Defaults to `false` */
        required?: boolean;
        // /** A set of predefined choices the user can pick from for this argument */
        // choices?: {
        //     name: string;
        //     value: string;
        // }[];
    }[];
}

/** Client event names */
export type EventName = keyof ClientEvents;
