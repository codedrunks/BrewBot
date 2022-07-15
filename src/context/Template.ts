import { CtxMenu } from "@src/CtxMenu";
import { ApplicationCommandType } from "discord-api-types/v10";
import { ContextMenuInteraction } from "discord.js";

export class TEMPLATE extends CtxMenu
{
    constructor()
    {
        super({
            name: "template",
            type: ApplicationCommandType.Message,
        });
    }

    async run(int: ContextMenuInteraction)
    {
        void int;
    }
}
