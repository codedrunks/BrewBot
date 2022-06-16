import EventEmitter from "events";
import { ApplicationCommandDataResolvable, ButtonInteraction, CommandInteraction, CommandInteractionOption, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandMeta, SubcommandMeta } from "./types";
import { ChannelType } from "discord-api-types/v10";

export interface Command {
    on(evt: "buttonPress", listener: (guildId: string, messageId: string, int: ButtonInteraction) => void): this;
}

/** Base class for all slash commands */
export abstract class Command extends EventEmitter
{
    readonly meta: CommandMeta | SubcommandMeta;
    protected slashCmdJson: ApplicationCommandDataResolvable;
    /** Set to false to disable this command */
    public enabled = true;

    //#SECTION constructor

    /** Base class for all slash commands */
    constructor(cmdMeta: CommandMeta | SubcommandMeta)
    {
        super();

        const data = new SlashCommandBuilder();

        if(Command.isCommandMeta(cmdMeta))
        {
            // regular command
            const fallbackMeta = {
                perms: [],
                args: [],
            };

            this.meta = { ...fallbackMeta, ...cmdMeta };
            const { name, desc, args } = this.meta;

            data.setName(name)
                .setDescription(desc);

            // string arguments
            Array.isArray(args) && args.forEach(arg => {
                if(arg.type === "user")
                    data.addUserOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else if(arg.type === "number")
                    data.addNumberOption(opt => {
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false);

                        arg.min && opt.setMinValue(arg.min);
                        arg.max && opt.setMinValue(arg.max);

                        return opt;
                    });
                else if(arg.type === "boolean")
                    data.addBooleanOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else if(arg.type === "channel")
                    data.addChannelOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildPublicThread)
                    );
                else if(arg.type === "role")
                    data.addRoleOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else if(arg.type === "attachment")
                    data.addAttachmentOption(opt =>
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false)
                    );
                else
                    data.addStringOption(opt => {
                        opt.setName(arg.name)
                            .setDescription(arg.desc)
                            .setRequired(arg.required ?? false);

                        if(Array.isArray(arg.choices))
                            opt.addChoices(...arg.choices);

                        return opt;
                    });
            });
        }
        else
        {
            // subcommands
            this.meta = cmdMeta;

            data.setName(cmdMeta.name)
                .setDescription(cmdMeta.desc);

            cmdMeta.subcommands.forEach(scmd => {
                data.addSubcommand(sc => {
                    sc.setName(scmd.name)
                        .setDescription(scmd.desc);

                    Array.isArray(scmd.args) && scmd.args.forEach(arg => {
                        if(arg.type === "user")
                            sc.addUserOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else if(arg.type === "number")
                            sc.addNumberOption(opt => {
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false);

                                arg.min && opt.setMinValue(arg.min);
                                arg.max && opt.setMinValue(arg.max);

                                return opt;
                            });
                        else if(arg.type === "boolean")
                            sc.addBooleanOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else if(arg.type === "channel")
                            sc.addChannelOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                                    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildPublicThread)
                            );
                        else if(arg.type === "role")
                            data.addRoleOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else if(arg.type === "attachment")
                            data.addAttachmentOption(opt =>
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false)
                            );
                        else
                            sc.addStringOption(opt => {
                                opt.setName(arg.name)
                                    .setDescription(arg.desc)
                                    .setRequired(arg.required ?? false);

                                if(Array.isArray(arg.choices))
                                    opt.addChoices(...arg.choices);

                                return opt;
                            });
                    });

                    return sc;
                });
            });
        }

        // finalize
        this.slashCmdJson = data.toJSON() as ApplicationCommandDataResolvable;
    }

    //#SECTION public

    /** Returns the slash command JSON data (needed when registering commands) */
    public getSlashCmdJson(): ApplicationCommandDataResolvable
    {
        return this.slashCmdJson;
    }

    /** Called when a user tries to run this command (if the user doesn't have perms this resolves null) */
    public async tryRun(interaction: CommandInteraction, opt?: CommandInteractionOption<"cached">): Promise<unknown>
    {
        try
        {
            if(opt ? this.hasPerm(interaction, opt?.name) : this.hasPerm(interaction))
                return await this.run(interaction, opt);
            else if(typeof interaction.reply === "function")
                return await interaction.reply({ content: "You don't have permission to run this command.", ephemeral: true });

            return null;
        }
        catch(err)
        {
            if(typeof interaction.reply === "function")
                return await interaction.reply({ content: `Couldn't run the command due to an error${err instanceof Error ? `: ${err.message}` : "."}`, ephemeral: true });
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

        if(Command.isCommandMeta(this.meta))
        {
            // regular command
            const { perms } = this.meta;
            const hasPerms = !Array.isArray(perms) ? [] : perms.map(p => memberPermissions?.has(p));

            return !hasPerms.includes(false);
        }
        else if(subcommandName)
        {
            // subcommands
            const scMeta = this.meta.subcommands.find(me => me.name === subcommandName);
            if(!scMeta) return null;

            const { perms } = scMeta;
            const hasPerms = !Array.isArray(perms) ? [] : perms.map(p => memberPermissions?.has(p));

            return !hasPerms.includes(false);
        }

        return null;
    }

    /** Resolves a flat object of command arguments from an interaction */
    protected resolveArgs<T = string>({ options }: CommandInteraction): Record<string, T>
    {
        if(!Array.isArray(options.data))
            return {};

        const map = options.data.map(o => o.type === "SUB_COMMAND" ? o.options as CommandInteraction["options"] ?? undefined : o);
        const filt = map.filter(v => typeof v !== "undefined");
        const red = filt.reduce((acc, r) => {
            if(!r) return acc;
            const { name, value } = r;
            return {...acc, [name]: value};
        }, {});

        return red;
    }

    /**
     * Replies to a CommandInteraction.  
     * Has to be called within 3 seconds, otherwise the reply times out. Alternatively, use `deferReply()` and `editReply()` for 15 minutes.
     * @param int The CommandInteraction to reply to
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param ephemeral Set to true to make the command reply only visible to the author. Defaults to false (publicly visible).
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async reply(int: CommandInteraction, content: string | MessageEmbed | MessageEmbed[], ephemeral = false, actions?: MessageButton | MessageButton[])
    {
        if(typeof content === "string")
            await int.reply({ content, ephemeral, ...Command.useButtons(actions) });
        else if((Array.isArray(content) && content[0] instanceof MessageEmbed) || content instanceof MessageEmbed)
            await int.reply({ embeds: Array.isArray(content) ? content : [content], ephemeral, ...Command.useButtons(actions) });
    }

    /**
     * Defers a CommandInteraction and displays a "bot is thinking..." message, so it can be responded to after a maximum of 15 minutes
     * @param int The CommandInteraction to reply to
     * @param ephemeral Set to true to make both the "bot is thinking..." message and command reply only visible to the author. Defaults to false (publicly visible).
     */
    protected async deferReply(int: CommandInteraction, ephemeral = false)
    {
        return await int.deferReply({ ephemeral });
    }

    /**
     * Edits the reply of a CommandInteraction or sends a new reply when used after `deferReply()`
     * @param int The CommandInteraction to edit the reply of
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async editReply(int: CommandInteraction, content: string | MessageEmbed | MessageEmbed[], actions?: MessageButton | MessageButton[])
    {
        if(typeof content === "string")
            await int.editReply({ content, ...Command.useButtons(actions) });
        else if((Array.isArray(content) && content[0] instanceof MessageEmbed) || content instanceof MessageEmbed)
            await int.editReply({ embeds: Array.isArray(content) ? content : [content], ...Command.useButtons(actions) });
    }

    /** Deletes the reply of a CommandInteraction */
    protected async deleteReply(int: CommandInteraction)
    {
        int.replied && await int.deleteReply();
    }

    //#SECTION static

    /** Returns an object from passed buttons that can be spread onto an interaction reply */
    public static useButtons(buttons?: MessageButton | MessageButton[]): { components: MessageActionRow[] } | Record<string, never>
    {
        const actRows = Array.isArray(buttons) ? buttons : (buttons ? [buttons] : undefined);

        if(!actRows || actRows.length === 0)
            return {};

        const act = new MessageActionRow()
            .addComponents(actRows);

        return actRows ? { components: [act] } : {};
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
