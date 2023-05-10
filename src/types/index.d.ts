import { ClientEvents, ApplicationCommandOptionType, BufferResolvable, JSONEncodable, APIAttachment, Attachment, AttachmentBuilder, AttachmentPayload, CommandInteraction, ButtonInteraction, ModalSubmitInteraction, ContextMenuCommandInteraction } from "discord.js";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Stream } from "node:stream";

//#MARKER commands

/** A single argument of a slash command */
type CommandArg = BaseCommandArg & (StringCommandArg | NumberCommandArg | IntegerCommandArg | BooleanCommandArg | UserCommandArg | ChannelCommandArg | RoleCommandArg | AttachmentCommandArg);

interface ChoiceCmdArg<T> {
    /** A set of predefined choices the user can pick from for this argument */
    choices?: {
        name: string;
        value: T;
    }[];
}

interface BaseCommandArg {
    name: string;
    /** Max 100 chars */
    desc: string;
    /** Defaults to `false` */
    required?: boolean;
}

interface StringCommandArg extends ChoiceCmdArg<string> {
    type: ApplicationCommandOptionType.String;
}

interface NumberCommandArg extends ChoiceCmdArg<number> {
    type: ApplicationCommandOptionType.Number;
    min?: number;
    max?: number;
}

interface IntegerCommandArg extends ChoiceCmdArg<number> {
    type: ApplicationCommandOptionType.Integer;
    min?: number;
    max?: number;
}

interface BooleanCommandArg {
    type: ApplicationCommandOptionType.Boolean;
}

interface UserCommandArg {
    type: ApplicationCommandOptionType.User;
}

interface ChannelCommandArg {
    type: ApplicationCommandOptionType.Channel;
}

interface RoleCommandArg {
    type: ApplicationCommandOptionType.Role;
}

interface AttachmentCommandArg {
    type: ApplicationCommandOptionType.Attachment;
}

/** The different categories that a command can be, these are denoted by the directory name a command is located in */
export type CommandCategory = "economy" | "fun" | "games" | "mod" | "music" | "util" | "restricted";

interface CmdMetaBase {
    /** Name of the command (`/name` to call it in chat) */
    name: string;
    /** Description that's displayed when typing the command in chat */
    desc: string;
    // TODO:
    // /** Whether this is a global or guild command */
    // type: "guild" | "global";
    /** If this is used, the command is still displayed but errors on use. Only use this in subcommands. */
    perms?: PermissionFlagsBits[];
    /** (for guild commands) member permissions needed to view and use this command */
    memberPerms?: PermissionFlagsBits[];
    /** Category of the command */
    category: CommandCategory;
    /** Set to true to allow this command to be used in DMs */
    allowDM?: boolean;
    /** Set to true to only allow developers set in `settings.devs` to run this */
    devOnly?: boolean;
}

/** Meta information of a regular Command instance */
export interface CommandMeta extends CmdMetaBase {
    /** Optional array of arguments this command has */
    args?: CommandArg[];
}

/** Meta information of a Command instance that has multiple subcommands - see https://discordjs.guide/interactions/slash-commands.html#subcommands */
export interface SubcommandMeta extends CmdMetaBase {
    /** Array of subcommands */
    subcommands: Pick<CommandMeta, "name" | "desc" | "args" | "perms">[];
}

/** Result of PUTing an application guild command (slash or context) to the Discord API */
export interface PutApplicationGuildCommandsResult {
    application_id: string;
    default_member_permissions: null | string;
    default_permission: boolean;
    description_localizations: null;
    description: string;
    guild_id: string;
    id: string;
    name_localizations: null;
    name: string;
    options?: Record<string, unknown>[];
    type: ApplicationCommandOptionType;
    version: string;
}

//#MARKER events

/** Client event names */
export type EventName = keyof ClientEvents;

//#MARKER context menus

export interface CtxMeta {
    name: string;
    /** Whether this context menu is attached to a user profile (or mention) or a message */
    type: ApplicationCommandType.User | ApplicationCommandType.Message;
    /** Default member permissions needed to use this context menu */
    memberPerms?: PermissionFlagsBits[];
}

//#MARKER discord types

export type DiscordAPIFile = BufferResolvable | Stream | JSONEncodable<APIAttachment> | Attachment | AttachmentBuilder | AttachmentPayload;

export type AnyInteraction = CommandInteraction | ButtonInteraction | ModalSubmitInteraction | ContextMenuCommandInteraction;

//#MARKER utils

// The tuple type allows us to create arrays with certain lengths that are type-safe (doesn't protect from push()ing over N elements)
export type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N ? R : _TupleOf<T, N, [T, ...R]>;
