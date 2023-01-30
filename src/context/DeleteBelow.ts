import { CtxMenu } from "@src/CtxMenu";
import { settings } from "@src/settings";
import { BtnMsg, embedify, useEmbedify } from "@src/utils";
import { ApplicationCommandType, PermissionFlagsBits } from "discord-api-types/v10";
import { ButtonBuilder, ButtonStyle, Collection, ContextMenuCommandInteraction, GuildTextBasedChannel, Message } from "discord.js";


export class DeleteBelow extends CtxMenu
{
    constructor() {
        super({
            name: "Delete below and including",
            type: ApplicationCommandType.Message,
            memberPerms: [ PermissionFlagsBits.ManageMessages ],
        });
    }

    async run(int: ContextMenuCommandInteraction) {
        const err = (msg?: string) => {
            const ebdOpts = useEmbedify(`Couldn't delete the messages${msg ? `:\n${msg}` : " due to an error."}`, settings.embedColors.error);
            if(int.deferred || int.replied)
                int.editReply(ebdOpts);
            else
                int.reply({ ...ebdOpts, ephemeral: true });
        };

        // this condition will never be true, it's just for TS to shut up
        if(!int.isMessageContextMenuCommand())
            return;

        const msg = int.targetMessage;

        if(!msg.member || !msg.guild)
            return err("This command can only be used in a server.");

        if(!msg.member.permissionsIn(msg.channel.id).has(PermissionFlagsBits.ManageMessages))
            return err("You don't have the permission to delete messages in this channel.");

        const { channel } = msg;

        let msgCount = 0;

        await int.deferReply({ ephemeral: true });

        try {
            const msgs = (await channel.messages.fetch({ after: msg.id }))
                .reduce((acc, cur) => {
                    cur.deletable && acc.set(cur.id, cur);
                    return acc;
                }, new Collection<string, Message<boolean>>());
            msgs.set(msg.id, msg);

            msgCount = msgs.size;

            const sortedMsgs = msgs.sort((a, b) => a.createdTimestamp === b.createdTimestamp ? 0 : (a.createdTimestamp < b.createdTimestamp ? -1 : 1));

            const firstMsgLink = sortedMsgs.at(0)!.url,
                lastMsgLink = sortedMsgs.at(-1)!.url;

            const bm = new BtnMsg(
                embedify(msgCount > 1
                    ? `Are you sure you want to delete ${msgCount} messages from [here](${firstMsgLink}) to [here](${lastMsgLink})?`
                    : `Are you sure you want to delete [this message](${firstMsgLink})?`
                ),
                [[
                    new ButtonBuilder().setLabel("Delete").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Secondary),
                ]],
                { timeout: 60_000 },
            );

            let replied = false;

            bm.on("press", async (btn, btnInt) => {
                await btnInt.deferUpdate();
                if(btn.data.label === "Delete") {
                    await (channel as GuildTextBasedChannel).bulkDelete(msgs, true);
                    replied = true;
                    bm.destroy();
                    int.editReply({ ...bm.getReplyOpts(), ...useEmbedify(`Successfully deleted ${msgCount > 1 ? `all ${msgCount} messages` : "the message"}`, settings.embedColors.success) });
                }
                else if(btn.data.label === "Cancel") {
                    replied = true;
                    bm.destroy();
                    int.editReply({ ...bm.getReplyOpts(), ...useEmbedify("Canceled message deletion.", settings.embedColors.warning) });
                }
            });

            bm.on("destroy", () => !replied && int.editReply(bm.getReplyOpts()));
            int.editReply(bm.getReplyOpts());
        }
        catch(e) {
            return err();
        }

        if(msgCount < 1)
            return int.editReply(useEmbedify("No messages were deleted.", settings.embedColors.warning));
    }
}
