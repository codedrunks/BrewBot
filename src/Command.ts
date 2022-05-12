import { ApplicationCommandDataResolvable, CommandInteraction, PermissionFlags } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";


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

    /**
     * Returns the slash command JSON data (needed when registering commands)
     */
    public getSlashCmdJson(): ApplicationCommandDataResolvable
    {
        return this.slashCmdJson;
    }

    /**
     * Checks if the provided GuildMember has the permission to run this command
     */
    public hasPerm({ memberPermissions }: CommandInteraction): boolean
    {
        const { perms } = this.meta;
        const hasPerms = !Array.isArray(perms) ? [] : perms.map(p => memberPermissions?.has(p));

        return !hasPerms.includes(false);
    }

    /**
     * Tries to run this command (if the user doesn't have perms this resolves null)
     */
    public async tryRun(interaction: CommandInteraction): Promise<unknown>
    {
        if(this.hasPerm(interaction))
            return await this.run(interaction);
        return null; // TODO: error response?
    }

    /**
	 * Resolves a flat object of command arguments from an interaction
	 */
    public resolveArgs({ options }: CommandInteraction): Record<string, string>
    {
        return options?.data?.reduce((acc, { name, value }) => ({...acc, [name]: value}), {}) ?? {};
    }

    public async reply(int: CommandInteraction, content: string)
    {
        await int.reply({ content, ephemeral: true });
    }

    /**
     * This method is called whenever this commands is run by a user, after verifying the permissions
     * @abstract This method needs to be overridden in a sub-class
     */
    abstract run(interaction: CommandInteraction): Promise<unknown>;
}
