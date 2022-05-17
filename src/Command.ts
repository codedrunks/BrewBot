import { ApplicationCommandDataResolvable, CommandInteraction, MessageEmbed } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandMeta } from "./types";


/** Base class for all bot commands */
export abstract class Command {
    readonly meta: CommandMeta;
    protected slashCmdJson: ApplicationCommandDataResolvable;

    /** Base class for all bot commands */
    constructor(cmdMeta: CommandMeta)
    {
        // prepare metadata

        const fallbackMeta = {
            perm: "user",
            args: [],
        };

        this.meta = { ...fallbackMeta, ...cmdMeta };
        const { name, desc, args } = this.meta;

        // build slash command

        const data = new SlashCommandBuilder()
            .setName(name)
            .setDescription(desc);

        Array.isArray(args) && args.forEach(arg => {
            data.addStringOption(opt => 
                opt.setName(arg.name)
                    .setDescription(arg.desc)
                    .setRequired(arg.required ?? false)
            );
        });

        this.slashCmdJson = data.toJSON() as ApplicationCommandDataResolvable;
    }

    /** Returns the slash command JSON data (needed when registering commands) */
    public getSlashCmdJson(): ApplicationCommandDataResolvable
    {
        return this.slashCmdJson;
    }

    /** Checks if the GuildMember of a CommandInteraction has the permission to run this command */
    public hasPerm({ memberPermissions }: CommandInteraction): boolean
    {
        const { perms } = this.meta;
        const hasPerms = !Array.isArray(perms) ? [] : perms.map(p => memberPermissions?.has(p));

        return !hasPerms.includes(false);
    }

    /** Called when a user tries to run this command (if the user doesn't have perms this resolves null) */
    public async tryRun(interaction: CommandInteraction): Promise<unknown>
    {
        try
        {
            if(this.hasPerm(interaction))
                return await this.run(interaction);
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
    protected abstract run(int: CommandInteraction): Promise<unknown>;
}
