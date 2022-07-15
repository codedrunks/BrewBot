import { CtxMenu } from "@src/CtxMenu";
import { ApplicationCommandType, PermissionFlagsBits } from "discord-api-types/v10";
import { ContextMenuInteraction } from "discord.js";


export class TestMenu extends CtxMenu
{
    constructor()
    {
        super({
            name: "test",
            type: ApplicationCommandType.Message,
            memberPerms: [ PermissionFlagsBits.Administrator ],
        });
    }

    async run(int: ContextMenuInteraction)
    {
        int.reply(`${int.user.username} clicked context menu command "${int.commandName}" on message #${int.isMessageContextMenu() && int.targetMessage.id}`);
    }
}
