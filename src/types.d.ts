import { ClientEvents, PermissionFlags } from "discord.js";


//#MARKER persistent data

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

//#MARKER commands

/** A single argument of a slash command */
type CommandArg = BaseCmdArg & (StringCommandArg | NumberCommandArg | BooleanCommandArg | UserCommandArg);

interface BaseCmdArg {
    name: string;
    desc: string;
    /** Defaults to `false` */
    required?: boolean;
}

interface StringCommandArg {
    type?: "string";
    /** A set of predefined choices the user can pick from for this argument */
    choices?: {
        name: string;
        value: string;
    }[];
}

interface NumberCommandArg {
    type: "number";
    min?: number;
    max?: number;
}

interface BooleanCommandArg {
    type: "boolean";
}

interface UserCommandArg {
    type: "user";
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

//#MARKER events

/** Client event names */
export type EventName = keyof ClientEvents;
