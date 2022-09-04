import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ChannelType, Client, CommandInteraction, CommandInteractionOption, EmbedBuilder, TextBasedChannel } from "discord.js";
import k from "kleur";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { time } from "@discordjs/builders";
import { createNewUser, deleteReminder, deleteReminders, getExpiredReminders, getReminder, getReminders, getUser, setReminder } from "@src/database/users";
import { Reminder as ReminderObj } from "@prisma/client";
import { BtnMsg, embedify, PageEmbed, toUnix10, useEmbedify } from "@src/utils";

/** Max reminders per user (global) */
const reminderLimit = 10;

type TimeObj = Record<"days"|"hours"|"minutes"|"seconds"|"months"|"years", number>;

export class Reminder extends Command
{
    constructor(client: Client)
    {
        super({
            name: "reminder",
            desc: "Set a reminder to notify yourself after a certain time passed",
            category: "util",
            subcommands: [
                {
                    name: "set",
                    desc: "Sets a new reminder",
                    args: [
                        {
                            name: "name",
                            desc: "The name of the reminder",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "seconds",
                            desc: "In how many seconds",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 59,
                        },
                        {
                            name: "minutes",
                            desc: "In how many minutes",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 59,
                        },
                        {
                            name: "hours",
                            desc: "In how many hours",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 23,
                        },
                        {
                            name: "days",
                            desc: "In how many days",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 364,
                        },
                        {
                            name: "months",
                            desc: "In how many months (1 month = 30 days)",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 11,
                        },
                        {
                            name: "years",
                            desc: "In how many years",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                            max: 100,
                        },
                    ],
                },
                {
                    name: "list",
                    desc: "Lists all your reminders",
                },
                {
                    name: "delete",
                    desc: "Delete a reminder",
                    args: [
                        {
                            name: "reminder",
                            desc: "The name of the reminder or the ID (shown in /reminder list)",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: "delete_all",
                    desc: "Delete all your reminders",
                },
            ],
        });

        if(client instanceof Client)
        {
            try
            {
                // since the constructor is called exactly once at startup, this should work just fine
                this.checkReminders(client);
                setInterval(() => this.checkReminders(client), 1000);
            }
            catch(err)
            {
                console.error(k.red("Error while checking reminders:"), err);
            }
        }
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">)
    {
        const getTime = (timeObj: TimeObj) => {
            return 1000 * timeObj.seconds
                + 1000 * 60 * timeObj.minutes
                + 1000 * 60 * 60 * timeObj.hours
                + 1000 * 60 * 60 * 24 * timeObj.days
                + 1000 * 60 * 60 * 24 * 30 * timeObj.months
                + 1000 * 60 * 60 * 24 * 365 * timeObj.years;
        };

        const { user, guild, channel } = int;

        let action = "";
        try
        {
            switch(opt.name)
            {
            case "set":
            {
                //#SECTION add reminder
                action = "set a reminder";

                const args = {
                    name: int.options.get("name", true).value as string,
                    seconds: int.options.get("seconds")?.value as number ?? 0,
                    minutes: int.options.get("minutes")?.value as number ?? 0,
                    hours: int.options.get("hours")?.value as number ?? 0,
                    days: int.options.get("days")?.value as number ?? 0,
                    months: int.options.get("months")?.value as number ?? 0,
                    years: int.options.get("years")?.value as number ?? 0,
                };

                const { name, ...timeObj } = args;

                const dueInMs = getTime(timeObj);

                if(dueInMs < 1000 * 5)
                    return await this.reply(int, embedify("Please enter at least five seconds.", settings.embedColors.error), true);

                await this.deferReply(int, false);

                const reminders = await getReminders(user.id);

                if(reminders && reminders.length >= reminderLimit)
                    return await int.editReply(useEmbedify("Sorry, but you can't set more than 10 reminders.\nPlease free up some space with `/reminder delete`", settings.embedColors.error));

                const reminderId = reminders && reminders.length > 0 && reminders.at(-1)
                    ? reminders.at(-1)!.reminderId + 1
                    : 1;

                if(!await getUser(user.id))
                    await createNewUser(user.id);

                const dueTimestamp = new Date(Date.now() + dueInMs);

                await setReminder({
                    name: args.name,
                    guild: guild?.id ?? null,
                    userId: user.id,
                    channel: channel?.id ?? null,
                    reminderId,
                    dueTimestamp,
                });

                return await this.editReply(int, embedify(`I've set a reminder with the name \`${name}\`\nDue: ${time(toUnix10(dueTimestamp), "f")}\n\nTo list your reminders, use \`/reminder list\``, settings.embedColors.success));
            }
            case "list":
            {
                //#SECTION list all
                action = "list reminders";

                await this.deferReply(int, true);

                const reminders = await getReminders(user.id);

                if(!reminders || reminders.length === 0)
                    return await this.editReply(int, embedify("You don't have any active reminders.\nCreate a new one with `/reminder set`", settings.embedColors.error));

                const getReminderStr = (reminders: ReminderObj[]) => reminders.reduce((acc, cur, i) => acc + `> \`${cur.reminderId}\` : ${cur.name}\n> ${time(toUnix10(cur.dueTimestamp), "f")}${i !== reminders.length - 1 ? "\n\n" : ""}`, "");
                const getReminderEbd = (remStr: string, curPage?: number, maxPage?: number) =>
                {
                    const ebd = new EmbedBuilder()
                        .setTitle("Your reminders:")
                        .setDescription(remStr + "\n\nTo delete a reminder, use `/reminder delete`")
                        .setAuthor({
                            name: user.username,
                            iconURL: avatar ?? undefined,
                        })
                        .setColor(settings.embedColors.default);

                    curPage && maxPage && ebd.setFooter({ text: `Page ${curPage}/${maxPage}` });

                    return ebd;
                };

                const avatar = user.avatarURL({ extension: "png", size: 512 });

                const remStr = getReminderStr(reminders);

                const remindersPerPage = 8;

                if(reminders.length < remindersPerPage)
                    return await this.editReply(int, getReminderEbd(remStr));
                else
                {
                    const pages: EmbedBuilder[] = [];
                    const rems = [...reminders];

                    let pageNbr = 0;
                    while(rems.length > 0)
                    {
                        pageNbr++;
                        const remSlice = rems.splice(0, remindersPerPage);
                        const rStr = getReminderStr(remSlice);
                        pages.push(getReminderEbd(rStr, pageNbr, Math.ceil(reminders.length / remindersPerPage)));
                    }

                    const pe = new PageEmbed(pages, user.id, {
                        goToPageBtn: pages.length > 5,
                    });

                    return pe.useInt(int);
                }
            }
            case "delete":
            {
                //#SECTION delete one
                action = "delete a reminder";

                const remIdent = (int.options.get("reminder", true).value as string).trim();

                await this.deferReply(int, true);

                const deleteRem = async ({ reminderId, name }: ReminderObj) => {
                    await deleteReminder(reminderId, user.id);

                    return await int.editReply(useEmbedify(`Successfully deleted the reminder \`${name}\``, settings.embedColors.default));
                };

                if(remIdent.match(/d+/))
                {
                    const remId = parseInt(remIdent);
                    const rem = await getReminder(remId, user.id);

                    if(!rem)
                        return await int.editReply(useEmbedify("Couldn't find a reminder with this ID.\nUse `/reminder list` to list all your reminders and their IDs.", settings.embedColors.error));

                    return deleteRem(rem);
                }
                else
                {
                    const rems = await getReminders(user.id);

                    const notFound = () => int.editReply(useEmbedify("Couldn't find a reminder with this name.\nUse `/reminder list` to list all your reminders and their IDs.", settings.embedColors.error));

                    if(!rems || rems.length === 0)
                        return notFound();

                    const choices = rems.filter(r => r.name.toLowerCase() === remIdent.toLowerCase());

                    if(choices.length === 0)
                        return notFound();
                    else if(choices.length === 1)
                        return deleteRem(choices.at(0)!);
                    else
                    {
                        // TODO: let user choose which reminder to delete
                        return await int.editReply(useEmbedify("Found multiple reminders with this name.\nPlease use the reminder ID number, found with `/reminder list`, instead."));
                    }
                }
            }
            case "delete_all":
            {
                //#SECTION delete all
                action = "delete all reminders";

                await this.deferReply(int, true);

                const rems = await getReminders(user.id);

                if(!rems || rems.length === 0)
                    return int.editReply(useEmbedify("You don't have any active reminders.", settings.embedColors.error));

                const cont = embedify(`Are you sure you want to delete ${rems.length > 1 ? `all ${rems.length} reminders` : "your 1 reminder"}?\nThis action cannot be undone.`, settings.embedColors.warning);

                const btns: ButtonBuilder[] = [
                    new ButtonBuilder().setLabel("Delete all").setStyle(ButtonStyle.Danger).setEmoji("🗑️"),
                    new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Secondary).setEmoji("❌"),
                ];

                const bm = new BtnMsg(cont, btns, {
                    timeout: 1000 * 20,
                });

                bm.on("press", async (bt, btInt) => {
                    if(bt.data.label === btns.find(b => b.data.label)?.data.label)
                    {
                        await deleteReminders(rems.map(r => r.reminderId), user.id);
                        await btInt.reply({ ...useEmbedify("Deleted all reminders.", settings.embedColors.default), ephemeral: true });
                    }
                    else
                        await btInt.reply({ ...useEmbedify("Canceled deletion.", settings.embedColors.default), ephemeral: true });

                    bm.destroy();
                });

                const updateReply = () => int.editReply(bm.getReplyOpts());

                bm.once("timeout", updateReply);
                bm.once("destroy", updateReply);

                return await updateReply();
            }
            }
        }
        catch(err)
        {
            const cont = useEmbedify(`Couldn't ${action} due to an error:\n${err}`, settings.embedColors.error);
            if(int.replied || int.deferred)
                int.editReply(cont);
            else
                int.reply(cont);
        }
    }

    //#MARKER check reminders
    async checkReminders(client: Client)
    {
        const expRems = await getExpiredReminders();

        if(!expRems || expRems.length === 0)
            return;

        const promises: Promise<void>[] = [];

        const getExpiredEbd = ({ name }: ReminderObj) => new EmbedBuilder()
            .setTitle("Reminder")
            .setColor(settings.embedColors.default)
            .setDescription(`Your reminder with the name \`${name}\` has expired!`);

        const guildFallback = (rem: ReminderObj) => {
            try
            {
                const guild = client.guilds.cache.find(g => g.id === rem.guild);
                const chan = guild?.channels.cache.find(c => c.id === rem.channel);

                if(chan && [ChannelType.GuildText, ChannelType.GuildPublicThread, ChannelType.GuildPrivateThread].includes(chan.type))
                {
                    const c = chan as TextBasedChannel;
                    c.send({ embeds: [ getExpiredEbd(rem) ] });
                }
            }
            catch(err)
            {
                // TODO: track reminder "loss rate"
                //
                //  I  │ I I
                // ────┼────
                // I I │ I ⌐¬

                void err;
            }
            finally
            {
                deleteReminder(rem.reminderId, rem.userId);
            }
        };

        for(const rem of expRems)
        {
            const usr = client.users.cache.find(u => u.id === rem.userId);

            promises.push((async () => {
                if(!usr)
                    return guildFallback(rem);

                try
                {
                    const dm = await usr.createDM(true);

                    const msg = await dm.send({ embeds: [ getExpiredEbd(rem) ]});

                    if(!dm || !msg)
                        return guildFallback(rem);

                    await deleteReminder(rem.reminderId, rem.userId);
                }
                catch(err)
                {
                    return guildFallback(rem);
                }
            })());
        }

        await Promise.allSettled(promises);
    }
}
