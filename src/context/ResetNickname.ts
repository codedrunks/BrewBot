import { CtxMenu } from "@src/CtxMenu";
import { settings } from "@src/settings";
import { useEmbedify } from "@src/utils";
import { ApplicationCommandType, PermissionFlagsBits } from "discord-api-types/v10";
import { ContextMenuCommandInteraction, DiscordAPIError, GuildMember } from "discord.js";

export class ResetNickname extends CtxMenu
{
    constructor()
    {
        super({
            name: "Reset Nickname",
            type: ApplicationCommandType.User,
            memberPerms: [ PermissionFlagsBits.ChangeNickname ],
        });
    }

    async run(int: ContextMenuCommandInteraction)
    {
        if(!int.isUserContextMenuCommand())
            return int.reply({ ...useEmbedify("This command can only be used in a server.", settings.embedColors.error), ephemeral: true });

        try
        {
            if(int.targetMember instanceof GuildMember)
            {
                await int.targetMember.setNickname("");

                if(!int.replied)
                    return int.reply({ ...useEmbedify(`Reset the nickname of <@${int.targetMember.user.id}>`), ephemeral: true });
            }
        }
        catch(err)
        {
            if(err instanceof DiscordAPIError && err.status >= 400)
                return int.reply({ ...useEmbedify(`I can't reset the nickname of someone as noble as <@${int.targetMember?.user?.id}>\nOnly users with roles below the \`BrewBot\` role can have their nickname reset.`, settings.embedColors.error), ephemeral: true });
        }

        if(!int.replied)
            return int.reply({ ...useEmbedify(`Couldn't reset the nickname of <@${int.targetMember?.user?.id}>`, settings.embedColors.error), ephemeral: true });
    }
}
