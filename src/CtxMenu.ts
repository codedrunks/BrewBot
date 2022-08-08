import { ContextMenuCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ContextMenuInteraction } from "discord.js";
import { settings } from "./settings";

import { CtxMeta } from "./types";
import { embedify } from "./utils";

export abstract class CtxMenu
{
    public readonly meta: CtxMeta;
    public readonly ctxMenuJson: RESTPostAPIApplicationCommandsJSONBody;

    constructor(meta: CtxMeta)
    {
        this.meta = meta;

        const data = new ContextMenuCommandBuilder()
            .setName(meta.name)
            .setType(meta.type);

        meta.memberPerms && data.setDefaultMemberPermissions(meta.memberPerms.reduce((a, c) => a | c, 0n));

        this.ctxMenuJson = data.toJSON();
    }

    /** Tries to run this context menu command */
    public async tryRun(int: ContextMenuInteraction)
    {
        try
        {
            return await this.run(int);
        }
        catch(err)
        {
            const embeds = [ embedify(`Couldn't run this context menu command due to an error${err instanceof Error ? `: ${err.message}` : "."}`, settings.embedColors.error) ];

            if(typeof int.reply === "function" && !int.replied && !int.deferred)
                return await int.reply({ embeds, ephemeral: true });

            if(typeof int.editReply === "function" && (int.deferred || int.replied))
                return await int.editReply({ embeds });
        }
    }

    protected abstract run(int: ContextMenuInteraction): Promise<unknown>;
}
