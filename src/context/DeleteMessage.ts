import { CtxMenu } from "@src/CtxMenu";
import { settings } from "@src/settings";
import { useEmbedify } from "@src/utils";
import { ApplicationCommandType, PermissionFlagsBits } from "discord-api-types/v10";
import { ContextMenuCommandInteraction, Message } from "discord.js";


export class DeleteMessage extends CtxMenu
{
    constructor()
    {
        super({
            name: "Delete Message",
            type: ApplicationCommandType.Message,
            memberPerms: [ PermissionFlagsBits.ManageMessages ],
        });
    }

    async run(int: ContextMenuCommandInteraction)
    {
        const err = () => int.reply({ ...useEmbedify("Can't delete this message", settings.embedColors.error), ephemeral: true });

        if(!int.isMessageContextMenuCommand())
            return err();

        if(int.targetMessage instanceof Message)
            await int.targetMessage.delete();
        else
            return err();

        return int.reply({ ...useEmbedify("Deleted the message"), ephemeral: true });
    }
}
