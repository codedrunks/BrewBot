import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { PermissionFlagsBits } from "discord-api-types/v10";

import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { ExecModal } from "@src/modals/exec";

export class Exec extends Command
{
    constructor()
    {
        super({
            name: "exec",
            desc: "Developer command",
            category: "restricted",
            args: [
                {
                    name: "ephemeral",
                    desc: "ephemeral - default false",
                    type: ApplicationCommandOptionType.Boolean,
                }
            ],
            memberPerms: [ PermissionFlagsBits.Administrator ],
            devOnly: true,
        });

        this.enabled = settings.commands.execEnabled;
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const ephemeral = int.options.get("ephemeral")?.value as boolean | undefined;

        const modal = new ExecModal(ephemeral ?? false);

        return await int.showModal(modal.getInternalModal());
    }
}
