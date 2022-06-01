import { Collection, CommandInteraction, Message } from "discord.js";
import k from "kleur";
import { Command } from "../../Command";

export class Delete extends Command {
    constructor()
    {
        super({
            name: "del",
            desc: "Deletes a specific amount of messages",
            args: [
                {
                    name: "amount",
                    desc: "How many messages to delete. Must be between 1 and 50.",
                },
                {
                    name: "up_until",
                    desc: "Deletes from the bottom until this ID or link is reached.\nIf amount is set, deletes downwards",
                },
            ],
            perms: [ "MANAGE_MESSAGES" ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { channel } = int;
        const args = this.resolveArgs(int);
        const amtRaw = parseInt(args?.amount);
        const amount = Math.min(Math.max(amtRaw, 1), 50);

        if(!channel || channel?.type === "DM")
            return;

        try
        {
            await channel.messages.fetch();

            const until = String(args.up_until ?? "_");
            const untilType = until.match(/\/[0-9]+$/) ? "link" : (until.match(/^[0-9]+$/) ? "id" : undefined);

            let untilId = "";

            switch(untilType)
            {
            default:
                if(!isNaN(amtRaw))
                {
                    await channel.bulkDelete(amount);
                    await this.reply(int, `Deleted **${amount}** message${amount !== 1 ? "s" : ""}`, true);
                }
                else
                    await this.reply(int, "Couldn't bulk delete messages", true);
                return;
            case "link":
            {
                untilId = String(until.split("/").at(-1)).trim();
                break;
            }
            case "id":
                untilId = until.trim();
                break;
            }

            const msgColl = new Collection<string, Message>();

            if(isNaN(amount))
            {
                const emptyMsgArr: Message[] = [];

                // TODO: check all the fucky wucky shit

                const msgs = channel.messages.cache.reduce((acc, cur) => ([ ...acc, cur ]), emptyMsgArr).sort((a, b) => a.createdTimestamp < b.createdTimestamp ? 0 : 1);

                let cutoffIdx = 0;

                msgs.find((m, i) => {
                    if(m.id === untilId)
                        cutoffIdx = i;
                });

                for(let i = 0; i < cutoffIdx; i++)
                    msgColl.set(msgs[i].id, msgs[i]);
            }
            else
            {
                return;
            }

            await channel.bulkDelete(msgColl);
        }
        catch (err)
        {
            await this.reply(int, "Couldn't bulk delete messages", true);
            console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
        }
    }
}
