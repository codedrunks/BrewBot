import { ContextMenuCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ContextMenuInteraction } from "discord.js";

import { CtxMeta } from "./types";

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

    public abstract run<T>(int: ContextMenuInteraction): Promise<T>;
}
