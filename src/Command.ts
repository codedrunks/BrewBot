import { ApplicationCommandDataResolvable, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandMeta } from "./types";

export { CommandMeta };


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
     * Called when a user tries to run this command (if the user doesn't have perms this resolves null)
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
    protected resolveArgs({ options }: CommandInteraction): { [key: string]: string }
    {
        return options?.data?.reduce((acc, { name, value }) => ({...acc, [name]: value}), {}) ?? {};
    }

    protected async reply(int: CommandInteraction, content: string, ephemeral = true)
    {
        await int.reply({ content, ephemeral });
    }

    /**
     * This method is called whenever this commands is run by a user, after verifying the permissions
     * @abstract This method needs to be overridden in a sub-class
     */
    protected abstract run(interaction: CommandInteraction): Promise<unknown>;
}
