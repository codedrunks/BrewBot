import { CtxMenu } from "@src/CtxMenu";
import { ApplicationCommandType } from "discord-api-types/v10";
import { ContextMenuCommandInteraction } from "discord.js";

export class TEMPLATE extends CtxMenu
{
    constructor()
    {
        super({
            name: "template",
            type: ApplicationCommandType.Message,
        });
    }

    async run(int: ContextMenuCommandInteraction)
    {
        void int;
    }
}
