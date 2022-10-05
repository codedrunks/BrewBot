import { ClientEvents, ApplicationCommandOptionType, BufferResolvable, JSONEncodable, APIAttachment, Attachment, AttachmentBuilder, AttachmentPayload } from "discord.js";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { ContextMenuCommandType } from "@discordjs/builders";
import { Stream } from "node:stream";

//#MARKER commands

export type AnyCmdInteraction = CommandInteraction | ButtonInteraction | ModalSubmitInteraction | ContextMenuInteraction;

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
    perms?: PermissionFlagsBits[];
    /** Default member permissions needed to view and use this command */
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
    subcommands: Omit<CommandMeta, "memberPerms" | "category">[];
}

/** Result of PUTing a guild command to the Discord API */
export interface PutGuildCommandResult {
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

//#MARKER context menus

export interface CtxMeta {
    name: string;
    /** Accepts `User` or `Message` of `ApplicationCommandType` enum from `discord-api-types/v10` */
    type: ContextMenuCommandType;
    /** Default member permissions needed to use this context menu */
    memberPerms?: PermissionFlagsBits[];
}

//#MARKER discord types

export type DiscordAPIFile = BufferResolvable | Stream | JSONEncodable<APIAttachment> | Attachment | AttachmentBuilder | AttachmentPayload;
