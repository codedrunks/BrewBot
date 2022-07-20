import { ClientEvents, ColorResolvable, PermissionFlags } from "discord.js";


//#MARKER persistent data

/** Persistent data stored in `./data.json` */
export interface PersistentData
{
    /** Timestamp of when the bot last started up */
    startupTime: number;
    /** Reaction roles messages and emojis */
    reactionMessages?: ReactionMsg[];
    /** Color of previously ran log command, used to help visually separate log sets */
    lastLogColor?: ColorResolvable;
    /** Chess message ID to edit on each turn */
    chessEmbedId?: string;
    /** Bot logs channel */
    botLogs: {
        guild: string;
        channel: string;
    };
    /** Warnings given to users */
    warnings?: {
        /** Guild ID */
        guild: string;
        /** Member ID */
        member: string;
        warnings: {
            reason: string;
            timestamp: number;
        }[];
    }[];
    reminders?: {
        member: string;
        guild: string;
        name: string;
        dueTimestamp: number;
    }[];
}

/** Keys of the persistent data object */
export type DataKey = keyof PersistentData;

//#MARKER commands

/** A single argument of a slash command */
type CommandArg = BaseCommandArg & (StringCommandArg | NumberCommandArg | BooleanCommandArg | UserCommandArg | ChannelCommandArg);

interface BaseCommandArg {
    name: string;
    /** Max 100 chars */
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

interface ChannelCommandArg {
    type: "channel";
}

/** Meta information of a regular Command instance */
export interface CommandMeta {
    /** Name of the command (`/name` to call it in chat) */
    name: string;
    /** Description that's displayed when typing the command in chat */
    desc: string;
    /** Optional array of arguments this command has */
    args?: CommandArg[];
    /** Required permission(s) to run this command */
    perms?: (keyof PermissionFlags)[];
}

/** Meta information of a Command instance that has multiple subcommands - see https://discordjs.guide/interactions/slash-commands.html#subcommands */
export interface SubcommandMeta {
    /** Name of the command (`/name` to call it in chat) */
    name: string;
    /** Description that's displayed when typing the command in chat */
    desc: string;
    /** Array of subcommands */
    subcommands: CommandMeta[];
}

//#SECTION reactionroles

export interface ReactionRole {
    /** Reaction emoji */
    emoji: string;
    /** Role ID */
    id: string;
}

export interface ReactionMsg {
    /** Guild ID */
    guild: string;
    msgs: {
        /** Message ID */
        message: string;
        roles: ReactionRole[];
    }[];
}

//#MARKER events

/** Client event names */
export type EventName = keyof ClientEvents;
