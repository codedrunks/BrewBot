import { ButtonInteraction, CommandInteraction, CommandInteractionOption, ActionRowBuilder, ButtonBuilder, EmbedBuilder, PermissionsString, ApplicationCommandOptionType } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandMeta, SubcommandMeta, Tuple } from "@src/types";
import { ChannelType, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import k from "kleur";
import { embedify } from "@utils/embedify";
import { settings } from "./settings";

export interface Command {
    on(evt: "buttonPress", listener: (guildId: string, messageId: string, int: ButtonInteraction) => void): this;
}

/** Base class for all slash commands */
export abstract class Command
{
    public readonly meta: CommandMeta | SubcommandMeta;
    public readonly slashCmdJson: RESTPostAPIApplicationCommandsJSONBody;
    /** Set to false to disable this command */
    public enabled = true;

    //#SECTION constructor

    /**
     * Base class for all slash commands
     * @param cmdMeta Meta object that describes this command
     */
    constructor(cmdMeta: CommandMeta | SubcommandMeta)
    {
        const data = new SlashCommandBuilder();

        cmdMeta.memberPerms && data
            .setDefaultMemberPermissions(cmdMeta.memberPerms.reduce((acc, cur) => acc | cur, 0n));

        const fallbackMeta: Partial<CommandMeta> = {
            perms: [],
            args: [],
            allowDM: false,
        };

        if(cmdMeta.desc.length > 100)
            throw new Error(`${k.yellow(`/${cmdMeta.name}`)}: Description can't be longer than 100 chars, got ${cmdMeta.desc.length}`);

        if(Command.isCommandMeta(cmdMeta))
        {
            // top level command
            this.meta = { ...fallbackMeta, ...cmdMeta };
            const { name, desc, args } = this.meta;

            data.setName(name)
                .setDescription(desc);

            Array.isArray(args) && args.forEach(arg => {
                if(arg.desc.length > 100)
                    throw new Error(`${k.yellow(`/${this.meta.name}`)}: Description of arg ${k.yellow(arg.name)} can't be longer than 100 chars, got ${arg.desc.length}`);

                if(arg.type === ApplicationCommandOptionType.User)
                    data.addUserOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else if(arg.type === ApplicationCommandOptionType.Number)
                    data.addNumberOption(opt => {
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false);

                        arg.min && opt.setMinValue(arg.min);
                        arg.max && opt.setMaxValue(arg.max);

                        arg.choices && opt.addChoices(...arg.choices);

                        return opt;
                    });
                else if(arg.type === ApplicationCommandOptionType.Integer)
                    data.addIntegerOption(opt => {
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false);

                        arg.min && opt.setMinValue(arg.min);
                        arg.max && opt.setMaxValue(arg.max);

                        arg.choices && opt.addChoices(...arg.choices);

                        return opt;
                    });
                else if(arg.type === ApplicationCommandOptionType.Boolean)
                    data.addBooleanOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else if(arg.type === ApplicationCommandOptionType.Channel)
                    data.addChannelOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildPublicThread)
                    );
                else if(arg.type === ApplicationCommandOptionType.Role)
                    data.addRoleOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else if(arg.type === ApplicationCommandOptionType.Attachment)
                    data.addAttachmentOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else if(arg.type === ApplicationCommandOptionType.String)
                    data.addStringOption(opt => {
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false);

                        arg.choices && opt.addChoices(...arg.choices);

                        return opt;
                    });
                else
                    throw new Error("Unimplemented option type");
            });
        }
        else
        {
            // subcommands
            this.meta = { ...fallbackMeta, ...cmdMeta };

            data.setName(cmdMeta.name)
                .setDescription(cmdMeta.desc);

            cmdMeta.subcommands.forEach(scmd => {
                if(scmd.desc.length > 100)
                    throw new Error(`${k.yellow(`/${this.meta.name}`)}: Description of subcommand ${k.yellow(scmd.name)} can't be longer than 100 chars, got ${scmd.desc.length}`);

                data.addSubcommand(sc => {
                    sc.setName(scmd.name)
                        .setDescription(scmd.desc);

                    Array.isArray(scmd.args) && scmd.args.forEach(arg => {
                        if(arg.desc.length > 100)
                            throw new Error(`${k.yellow(`/${this.meta.name}`)}: Description of subcommand ${k.yellow(scmd.name)} argument ${k.yellow(arg.name)} can't be longer than 100 chars, got ${arg.desc.length}`);

                        if(arg.type === ApplicationCommandOptionType.User)
                            sc.addUserOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else if(arg.type === ApplicationCommandOptionType.Number)
                            sc.addNumberOption(opt => {
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false);

                                arg.min && opt.setMinValue(arg.min);
                                arg.max && opt.setMaxValue(arg.max);

                                arg.choices && opt.addChoices(...arg.choices);

                                return opt;
                            });
                        else if(arg.type === ApplicationCommandOptionType.Integer)
                            sc.addIntegerOption(opt => {
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false);

                                arg.min && opt.setMinValue(arg.min);
                                arg.max && opt.setMaxValue(arg.max);

                                arg.choices && opt.addChoices(...arg.choices);

                                return opt;
                            });
                        else if(arg.type === ApplicationCommandOptionType.Boolean)
                            sc.addBooleanOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else if(arg.type === ApplicationCommandOptionType.Channel)
                            sc.addChannelOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                                    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildPublicThread)
                            );
                        else if(arg.type === ApplicationCommandOptionType.Role)
                            sc.addRoleOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else if(arg.type === ApplicationCommandOptionType.Attachment)
                            sc.addAttachmentOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else if(arg.type === ApplicationCommandOptionType.String)
                            sc.addStringOption(opt => {
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false);

                                arg.choices && opt.addChoices(...arg.choices);

                                return opt;
                            });
                        else
                            throw new Error("Unimplemented option");
                    });

                    return sc;
                });
            });
        }

        // finalize
        this.slashCmdJson = data.toJSON();
    }

    //#SECTION public

    /** Called when a user tries to run this command (if the user doesn't have perms this resolves null) */
    public async tryRun(int: CommandInteraction, opt?: CommandInteractionOption<"cached">): Promise<unknown>
    {
        try
        {
            const noPerm = () => int.reply({ embeds: [ embedify("You don't have permission to run this command.", settings.embedColors.error) ], ephemeral: true });

            if(this.meta.devOnly === true && !Array.isArray(settings.devs))
                throw new Error("Environment variables not set up correctly");

            if(this.meta.devOnly === true && !settings.devs.includes(int.user.id))
                return await noPerm();

            if(!this.meta.allowDM && !int.inGuild())
                return await this.reply(int, embedify("You can only use this command in a server.", settings.embedColors.error));

            if(opt ? this.hasPerm(int, opt?.name) : this.hasPerm(int))
                return await this.run(int, opt);
            else if(typeof int.reply === "function")
                return await noPerm();

            return null;
        }
        catch(err)
        {
            const embeds = [ embedify(`Couldn't run the command due to an error${err instanceof Error ? `: ${err.message}` : "."}`, settings.embedColors.error) ];

            console.error(`Error while running the command ${k.yellow(`/${int.commandName}`)}\n`, err);

            if(typeof int.reply === "function" && !int.replied && !int.deferred)
                return await int.reply({ embeds, ephemeral: true });

            if(typeof int.editReply === "function" && (int.deferred || int.replied))
                return await int.editReply({ embeds });

            return null;
        }
    }

    //#SECTION protected

    /**
     * Checks if the GuildMember of a CommandInteraction has the permission to run this command.
     * @param subcommandName Needs to be provided if this command has subcommands
     * @returns Returns null if the subcommand name is invalid
     */
    protected hasPerm(int: CommandInteraction, subcommandName?: string): boolean | null
    {
        const { memberPermissions } = int;

        const has = (metaPerms?: PermissionsString[]) =>
            !(!Array.isArray(metaPerms) ? [] : metaPerms.map(p => memberPermissions?.has(p))).includes(false);

        if(Command.isCommandMeta(this.meta))
            return has(this.meta.perms);
        else if(subcommandName)
        {
            const scMeta = this.meta.subcommands.find(me => me.name === subcommandName);
            if(scMeta)
                return has(scMeta.perms);
        }

        return null;
    }

    /**
     * Replies to a CommandInteraction.  
     * Has to be called within 3 seconds, otherwise the reply times out. Alternatively, use `deferReply()` and `editReply()` for 15 minutes.
     * @param int The CommandInteraction to reply to
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param ephemeral Set to true to make the command reply only visible to the author. Defaults to false (publicly visible).
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async reply(int: CommandInteraction, content: string | EmbedBuilder | EmbedBuilder[], ephemeral = false, actions?: ButtonBuilder | Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>)
    {
        if(typeof content === "string")
            await int.reply({ content, ephemeral, ...Command.useButtons(actions) });
        else if(content instanceof EmbedBuilder || (Array.isArray(content) && content[0] instanceof EmbedBuilder))
            await int.reply({ embeds: Array.isArray(content) ? content : [content], ephemeral, ...Command.useButtons(actions) });
    }

    /**
     * Defers a CommandInteraction and displays a "bot is thinking..." message, so it can be responded to after a maximum of 15 minutes
     * @param int The CommandInteraction to reply to
     * @param ephemeral Set to true to make both the "bot is thinking..." message and command reply only visible to the author. Defaults to false (publicly visible).
     */
    protected async deferReply(int: CommandInteraction, ephemeral = false)
    {
        await int.deferReply({ ephemeral });
    }

    /**
     * Edits the reply of a CommandInteraction or sends a new reply when used after `deferReply()`
     * @param int The CommandInteraction to edit the reply of
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async editReply(int: CommandInteraction, content: string | EmbedBuilder | EmbedBuilder[], actions?: ButtonBuilder | Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>)
    {
        if(typeof content === "string")
            await int.editReply({ content, ...Command.useButtons(actions) });
        else if(content instanceof EmbedBuilder || (Array.isArray(content) && content[0] instanceof EmbedBuilder))
            await int.editReply({ embeds: Array.isArray(content) ? content : [content], ...Command.useButtons(actions) });
    }

    /**
     * Follows up a reply with a new reply
     * @param int The CommandInteraction to follow up
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param ephemeral Set to true to make the follow up only visible to the author. Defaults to false (publicly visible)
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async followUpReply(int: CommandInteraction, content: string | EmbedBuilder | EmbedBuilder[], ephemeral = false, actions?: ButtonBuilder | Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>)
    {
        if(typeof content === "string")
            await int.followUp({ content, ephemeral, ...Command.useButtons(actions) });
        else if(content instanceof EmbedBuilder || (Array.isArray(content) && content[0] instanceof EmbedBuilder))
            await int.followUp({ embeds: Array.isArray(content) ? content : [content], ephemeral, ...Command.useButtons(actions) });
    }

    /** Deletes the reply of a CommandInteraction, only if it was already sent */
    protected async deleteReply(int: CommandInteraction)
    {
        int.replied && await int.deleteReply();
    }

    //#SECTION static

    /**
     * Returns an object from passed buttons that can be spread onto an interaction reply  
     * Returns an empty object if no buttons were passed, so it's always safe to spread
     * @example ```ts
     * await int.reply({ ...Command.useButtons(btns), content: "foo" });
     * ```
     */
    public static useButtons(buttons?: ButtonBuilder | Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>): { components: ActionRowBuilder<ButtonBuilder>[] }
    {
        const actRows = Array.isArray(buttons) ? buttons : (buttons ? [[buttons]] : []);
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];

        actRows.map(row => {
            rows.push(new ActionRowBuilder<ButtonBuilder>().setComponents(row));
            return row;
        });

        return { components: rows };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static isCommandMeta(meta: any): meta is CommandMeta
    {
        return typeof meta === "object" && meta.name && meta.desc && !Array.isArray(meta?.subcommands);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static isSubcommandMeta(meta: any): meta is SubcommandMeta
    {
        return typeof meta === "object" && meta.name && meta.desc && Array.isArray(meta?.subcommands);
    }

    //#SECTION abstract

    /**
     * This method is called whenever this commands is run by a user, after verifying the permissions
     * @param opt If this command has subcommands, this argument is set
     * @abstract This method needs to be overridden in a sub-class
     */
    protected abstract run(int: CommandInteraction, opt?: CommandInteractionOption<"cached">): Promise<unknown>;
}
