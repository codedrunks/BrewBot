import { ApplicationCommandDataResolvable, CommandInteraction, CommandInteractionOption, MessageEmbed } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandMeta, SubcommandMeta } from "./types";


/** Base class for all bot commands */
export abstract class Command {
    readonly meta: CommandMeta | SubcommandMeta;
    protected slashCmdJson: ApplicationCommandDataResolvable;

    /** Base class for all bot commands */
    constructor(cmdMeta: CommandMeta | SubcommandMeta)
    {
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
                data.addStringOption(opt => 
                    opt.setName(arg.name)
                        .setDescription(arg.desc)
                        .setRequired(arg.required ?? false)
                );
            });
        }
        else
        {
            // subcommands
            this.meta = cmdMeta;

            data.setName(cmdMeta.name)
                .setDescription(cmdMeta.desc);

            (cmdMeta as SubcommandMeta).subcommands.forEach(scmd => {
                data.addSubcommand(sc => {
                    sc.setName(scmd.name)
                        .setDescription(scmd.desc);

                    Array.isArray(scmd.args) && scmd.args.forEach(arg => {
                        sc.addStringOption(opt =>
                            opt.setName(arg.name)
                                .setDescription(arg.desc)
                                .setRequired(arg.required ?? false)
                        );
                    });

                    return sc;
                });
            });
        }

        // finalize
        this.slashCmdJson = data.toJSON() as ApplicationCommandDataResolvable;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static isCommandMeta(meta: any): meta is CommandMeta
    {
        return typeof meta === "object" && meta?.name && meta?.desc && !Array.isArray(meta?.subcommands);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static isSubcommandMeta(meta: any): meta is SubcommandMeta
    {
        return typeof meta === "object" && meta?.name && meta?.desc && Array.isArray(meta?.subcommands);
    }

    /** Returns the slash command JSON data (needed when registering commands) */
    public getSlashCmdJson(): ApplicationCommandDataResolvable
    {
        return this.slashCmdJson;
    }

    /**
     * Checks if the GuildMember of a CommandInteraction has the permission to run this command.
     * @param subcommandName Needs to be provided if this command has subcommands
     * @returns Returns null if the subcommand name is invalid
     */
    public hasPerm(int: CommandInteraction, subcommandName?: string): boolean | null
    {
        const { memberPermissions } = int;

        if(!Array.isArray(this.meta))
        {
            // regular command
            const { perms } = this.meta as CommandMeta;
            const hasPerms = !Array.isArray(perms) ? [] : perms.map(p => memberPermissions?.has(p));

            return !hasPerms.includes(false);
        }
        else if(subcommandName)
        {
            // subcommands
            const scMeta = (this.meta as SubcommandMeta).subcommands.find(me => me.name === subcommandName);
            if(!scMeta) return null;

            const { perms } = scMeta;
            const hasPerms = !Array.isArray(perms) ? [] : perms.map(p => memberPermissions?.has(p));

            return !hasPerms.includes(false);
        }

        return null;
    }

    /** Called when a user tries to run this command (if the user doesn't have perms this resolves null) */
    public async tryRun(interaction: CommandInteraction, opt?: CommandInteractionOption<"cached">): Promise<unknown>
    {
        try
        {
            if(opt ? this.hasPerm(interaction, opt?.name) : this.hasPerm(interaction))
                return await this.run(interaction, opt);
            else if(typeof interaction.reply === "function")
                return await interaction.reply({ content: "You don't have the necessary permissions to run this command!", ephemeral: true });

            return null;
        }
        catch(err)
        {
            if(typeof interaction.reply === "function")
                return await interaction.reply({ content: `Couldn't run the command due to an error: ${String(err)}`, ephemeral: true });
            return null;
        }
    }

    /** Resolves a flat object of command arguments from an interaction */
    protected resolveArgs({ options }: CommandInteraction): Record<string, string>
    {
        return options?.data?.reduce((acc, { name, value }) => ({...acc, [name]: value}), {}) ?? {};
    }

    /**
     * Replies to a CommandInteraction
     * @param int The CommandInteraction to reply to
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param ephemeral Set to false to make the reply publicly visible. Defaults to true (only visible for the author).
     */
    protected async reply(int: CommandInteraction, content: string | MessageEmbed | MessageEmbed[], ephemeral = true)
    {
        if(typeof content === "string")
            await int.reply({ content, ephemeral });
        else if((Array.isArray(content) && content[0] instanceof MessageEmbed) || content instanceof MessageEmbed)
            await int.reply({ embeds: Array.isArray(content) ? content : [content] });
    }

    /**
     * This method is called whenever this commands is run by a user, after verifying the permissions
     * @abstract This method needs to be overridden in a sub-class
     */
    protected abstract run(int: CommandInteraction, opt?: CommandInteractionOption<"cached">): Promise<unknown>;
}
