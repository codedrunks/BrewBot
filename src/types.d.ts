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
    };
    warnings: {
        memberId: string;
        reason: string;
        timestamp: number;
    }[];
}

/** Keys of the persistent data object */
export type DataKey = keyof PersistentData;

interface CommandArg {
    name: string;
    desc: string;
    /** Type of argument. Defaults to string. */
    type?: "string" | "user";
    /** Defaults to `false` */
    required?: boolean;
    // /** A set of predefined choices the user can pick from for this argument */
    // choices?: {
    //     name: string;
    //     value: string;
    // }[];
}

/** Meta information of a regular Command instance */
export interface CommandMeta {
    name: string;
    desc: string;
    /** Optional array of arguments this command has */
    args?: CommandArg[];
    /** Required permission(s) to run this command */
    perms?: (keyof PermissionFlags)[];
}

/** Meta information of a Command instance that has multiple subcommands - see https://discordjs.guide/interactions/slash-commands.html#subcommands */
export interface SubcommandMeta {
    name: string;
    desc: string;
    subcommands: CommandMeta[];
}

/** Client event names */
export type EventName = keyof ClientEvents;
