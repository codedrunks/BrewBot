import { PermissionFlagsBits } from "discord-api-types/v10";
import { Collection, CommandInteraction, Message } from "discord.js";
import k from "kleur";
import { Command } from "@src/Command";

const delMaxAmt = 50;

export class Delete extends Command {
    constructor()
    {
        super({
            name: "del",
            desc: "Deletes a specific amount of messages",
            category: "mod",
            args: [
                {
                    name: "amount",
                    type: "number",
                    desc: `How many messages to delete. Must be between 1 and ${delMaxAmt}.`,
                    min: 1,
                    max: delMaxAmt,
                },
                {
                    name: "up_until",
                    desc: "Deletes from the bottom until and including the message with this ID or link.",
                },
            ],
            perms: [ "MANAGE_MESSAGES" ],
            memberPerms: [ PermissionFlagsBits.ManageMessages ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int, true);

        const { channel } = int;
        const args = this.resolveArgs(int);
        const amtRaw = parseInt(args.amount);

        if(!args.up_until && isNaN(amtRaw))
            return await this.editReply(int, `Please enter the amount of messages to delete, between 1 and ${delMaxAmt}`);

        const amount = Math.min(Math.max(amtRaw, 1), delMaxAmt);

        if(!channel || channel?.type === "DM")
            return;

        try
        {
            await channel.messages.fetch();

            const until = String(args.up_until ?? "_");
            const untilType = until.match(/\/[0-9]+$/) ? "link" : (until.match(/^[0-9]+(-[0-9]+)?$/) ? "id" : undefined);

            let untilId = "";

            switch(untilType)
            {
            default:
                if(!isNaN(amtRaw))
                {
                    await channel.bulkDelete(amount);
                    await this.editReply(int, `Deleted **${amount}** message${amount !== 1 ? "s" : ""}`);
                }
                else
                    await this.editReply(int, "Couldn't bulk delete messages");
                return;
            case "link":
            {
                untilId = String(until.split("/").at(-1)).trim();
                break;
            }
            case "id":
                untilId = (until.includes("-") ? until.split("-")[1] : until).trim();
                break;
            }

            const msgColl = new Collection<string, Message>();

            const msgs = channel.messages.cache
                .reduce((acc, cur) => ([ ...acc, cur ]), [] as Message[])
                .sort((a, b) => a.createdTimestamp < b.createdTimestamp ? 0 : 1);

            let cutoffIdx = 0;

            msgs.find((m, i) => {
                if(m.id === untilId)
                {
                    cutoffIdx = i + 1;
                    return true;
                }
                return false;
            });

            for(let i = 0; i < cutoffIdx; i++)
                msgColl.set(msgs[i].id, msgs[i]);

            await channel.bulkDelete(msgColl, true);

            await this.editReply(int, `Successfully deleted ${msgColl.size} messages`);
        }
        catch (err)
        {
            await this.editReply(int, "Couldn't bulk delete messages");
            console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
        }
    }
}
