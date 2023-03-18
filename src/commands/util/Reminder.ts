import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ChannelType, Client, CommandInteraction, CommandInteractionOption, EmbedBuilder, Message, TextBasedChannel } from "discord.js";
import k from "kleur";
import { time } from "@discordjs/builders";
import { Reminder as ReminderObj } from "@prisma/client";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { autoPlural, BtnMsg, ButtonsTuple, embedify, PageEmbed, timeToMs, toUnix10, useEmbedify } from "@src/utils";
import { createNewUser, deleteReminder, deleteReminders, getExpiredReminders, getReminder, getReminders, getUser, setReminder } from "@src/database/users";
import { Tuple } from "@src/types";

/** Max reminders per user (global) */
const reminderLimit = 10;
const reminderCheckInterval = 2000;
/** To not exceed the embed limits & strain the DB */
const maxNameLength = 250;

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
                    name: "set_timer",
                    desc: "Sets a new reminder in the style of a timer that starts from now",
                    args: [
                        {
                            name: "name",
                            desc: "The name of the reminder",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "private",
                            desc: "Set to True to hide this reminder from other people",
                            type: ApplicationCommandOptionType.Boolean,
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
                    name: "set_date",
                    desc: "Sets a new reminder by providing an expiry date and time in UTC",
                    args: [
                        {
                            name: "name",
                            desc: "The name of the reminder",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "expiry",
                            desc: "UTC, 24 hours. Format: YYYY-MM-DD hh:mm:ss (or) YYYY-MM-DD hh:mm",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "private",
                            desc: "Set to True to hide this reminder from other people",
                            type: ApplicationCommandOptionType.Boolean,
                        },
                    ]
                },
                {
                    name: "set_time",
                    desc: "Sets a new reminder for a specific time today (in UTC)",
                    args: [
                        {
                            name: "name",
                            desc: "The name of the reminder",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "expiry",
                            desc: "UTC, 24 hours. Format: hh:mm:ss (or) hh:mm",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "private",
                            desc: "Set to True to hide this reminder from other people",
                            type: ApplicationCommandOptionType.Boolean,
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
            try {
                // since the constructor is called exactly once at startup, this should work just fine
                checkReminders(client);
                setInterval(() => checkReminders(client), reminderCheckInterval);
            }
            catch(err) {
                console.error(k.red("Error while checking reminders:"), err);
            }
        }
    }

    //#MARKER run

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">)
    {
        const { user, guild, channel } = int;

        let action = "run the reminder command";
        try
        {
            const tooSoon = () => this.reply(int, embedify("Please enter an expiry that's at least five seconds from now.", settings.embedColors.error), true);

            const setNewReminder = async (name: string, dueTimestamp: Date, ephemeral: boolean) => {
                if(name.length > maxNameLength)
                    return this.reply(int, embedify(`Please enter a name that's no longer than ${maxNameLength} characters`, settings.embedColors.error));

                await this.deferReply(int, ephemeral);

                const reminders = await getReminders(user.id);

                if(reminders && reminders.length >= reminderLimit)
                    return this.editReply(int, embedify("Sorry, but you can't set more than 10 reminders.\nPlease wait until a reminder expires or free up some space with `/reminder delete`", settings.embedColors.error));

                const reminderId = reminders && reminders.length > 0 && reminders.at(-1)
                    ? reminders.at(-1)!.reminderId + 1
                    : 1;

                if(!await getUser(user.id))
                    await createNewUser(user.id);

                await setReminder({
                    name,
                    guild: guild?.id ?? null,
                    userId: user.id,
                    channel: channel?.id ?? null,
                    reminderId,
                    dueTimestamp,
                    private: guild?.id ? ephemeral : true,
                });

                return await this.editReply(int, embedify(`I've set the following reminder:\n> ${name}\n> Due: ${time(toUnix10(dueTimestamp), "f")}\n\nID: \`${reminderId}\` • To list your reminders use \`/reminder list\``, settings.embedColors.success));
            };

            switch(opt.name)
            {
            case "set_timer":
            {
                //#SECTION set reminder by timer from now
                action = "set a reminder";

                const args = {
                    name: int.options.get("name", true).value as string,
                    ephemeral: int.options.get("private")?.value as boolean ?? false,
                    seconds: int.options.get("seconds")?.value as number ?? 0,
                    minutes: int.options.get("minutes")?.value as number ?? 0,
                    hours: int.options.get("hours")?.value as number ?? 0,
                    days: int.options.get("days")?.value as number ?? 0,
                    months: int.options.get("months")?.value as number ?? 0,
                    years: int.options.get("years")?.value as number ?? 0,
                };

                const { name, ephemeral, ...timeObj } = args;

                const dueInMs = timeToMs(timeObj);

                if(dueInMs < 1000 * 5)
                    return tooSoon();

                const dueTimestamp = new Date(Date.now() + dueInMs);

                return setNewReminder(args.name, dueTimestamp, ephemeral);
            }
            case "set_date":
            {
                //#SECTION set reminder by datetime
                action = "set a reminder";

                const name = int.options.get("name", true).value as string,
                    expiry = (int.options.get("expiry", true).value as string).trim(),
                    ephemeral = int.options.get("private")?.value as boolean ?? false;

                const expiryRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[\s,]+(\d{1,2})[:](\d{1,2})([:](\d{1,2}))?$/;

                if(!expiry.match(expiryRegex))
                    return this.reply(int, embedify("Please enter the expiry date and time in one of the following formats (24 hours, UTC):\n`YYYY-MM-DD hh:mm:ss` **or** `YYYY-MM-DD hh:mm`", settings.embedColors.error), true);

                // match() above makes sure this exec() can't return null
                const [, ...timeComponents] = expiryRegex.exec(expiry) as unknown as Tuple<string, 7>;

                const [year, month, day, hour, minute, second] = timeComponents
                    .slice(0, 6)
                    .map(c => !c ? 0 : (c.includes(":") ? Number(c.substring(1)) : Number(c)));

                const dueTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);

                if(dueTimestamp - Date.now() < 1000 * 5)
                    return tooSoon();

                return setNewReminder(name, new Date(dueTimestamp), ephemeral);
            }
            case "set_time":
            {
                //#SECTION set reminder by time today
                action = "set a reminder";

                const name = int.options.get("name", true).value as string,
                    expiry = (int.options.get("expiry", true).value as string).trim(),
                    ephemeral = int.options.get("private")?.value as boolean ?? false;

                const expiryRegex = /^(\d{1,2})[:](\d{1,2})([:](\d{1,2}))?$/;

                if(!expiry.match(expiryRegex))
                    return this.reply(int, embedify("Please enter the expiry time in one of the following formats (24 hours, UTC):\n`hh:mm:ss` **or** `hh:mm`", settings.embedColors.error), true);

                // match() above makes sure this exec() can't return null
                const [, ...timeComponents] = expiryRegex.exec(expiry) as unknown as Tuple<string, 7>;

                const [hour, minute, second] = timeComponents
                    .slice(0, 3)
                    // remove the `:` captured by the optional group and default to 0 if undefined
                    .map(c => !c ? 0 : (c.includes(":") ? Number(c.substring(1)) : Number(c)));

                const d = new Date();
                const dueTimestamp = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute, second);

                if(dueTimestamp - Date.now() < 1000 * 5)
                    return tooSoon();

                return setNewReminder(name, new Date(dueTimestamp), ephemeral);
            }
            case "list":
            {
                //#SECTION list all
                action = "list reminders";

                await this.deferReply(int, true);

                const reminders = await getReminders(user.id);

                if(!reminders || reminders.length === 0)
                    return await this.editReply(int, embedify("You don't have any active reminders.\nCreate a new one with `/reminder set`", settings.embedColors.error));

                const iconURL = user.avatarURL({ extension: "png", size: 512 }) ?? undefined;

                const getReminderStr = (reminders: ReminderObj[]) => reminders.reduce((acc, cur, i) =>
                    acc + `> ${cur.name.replace(/\n/gm, "\n> ")}\n> ID: \`${cur.reminderId}\` • ${time(toUnix10(cur.dueTimestamp), "f")}${i !== reminders.length - 1 ? "\n\n" : ""}`
                , "");
                const getReminderEbd = (remStr: string, curPage?: number, maxPage?: number) => {
                    const ebd = new EmbedBuilder()
                        .setTitle("Your reminders:")
                        .setDescription(remStr + "\n\nTo delete a reminder, use `/reminder delete`")
                        .setAuthor({ name: user.username, iconURL })
                        .setColor(settings.embedColors.default);

                    curPage && maxPage && ebd.setFooter({ text: `Page ${curPage}/${maxPage}` });

                    return ebd;
                };

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

                    return await int.editReply(useEmbedify(`Successfully deleted the following reminder:\n> ${name.replace(/\n/gm, "\n> ")}`, settings.embedColors.default));
                };

                const notFound = () => int.editReply(useEmbedify("Couldn't find a reminder with this name.\nUse `/reminder list` to list all your reminders and their IDs.", settings.embedColors.error));

                if(remIdent.match(/\d+/))
                {
                    const remId = parseInt(remIdent);
                    const rem = await getReminder(remId, user.id);

                    if(!rem)
                        return notFound();

                    return deleteRem(rem);
                }
                else
                {
                    const rems = await getReminders(user.id);

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

                const btns: Tuple<Tuple<ButtonBuilder, 2>, 1> = [[
                    new ButtonBuilder().setLabel(`Delete ${autoPlural("reminder", rems.length)}`).setStyle(ButtonStyle.Danger).setEmoji("🗑️"),
                    new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Secondary),
                ]];

                const bm = new BtnMsg(cont, btns, {
                    timeout: 1000 * 20,
                });

                bm.on("press", async (bt, btInt) => {
                    if(bt.data.label === btns.flat().find(b => b.data.label)?.data.label)
                    {
                        await deleteReminders(rems.map(r => r.reminderId), user.id);
                        await btInt.reply({ ...useEmbedify(`${rems.length > 1 ? `All ${rems.length} reminders have` : "Your 1 reminder has"} been deleted successfully.`, settings.embedColors.default), ephemeral: true });
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
}

//#MARKER check reminders

const rescheduleBtn = new ButtonBuilder().setLabel("Reschedule").setStyle(ButtonStyle.Secondary).setEmoji("⏭️");
/**
 * Contains all compound keys of reminders that are currently being checked.  
 * This is necessary because the check could take longer than `reminderCheckInterval` and check the same reminder twice.  
 * Format: `userId-reminderId`
 */
const reminderCheckBuffer = new Set<string>();

async function checkReminders(client: Client)
{
    const expRems = await getExpiredReminders();

    if(!expRems || expRems.length === 0)
        return;

    const promises: Promise<void>[] = [];

    const getExpiredEbd = ({ name }: ReminderObj) => new EmbedBuilder()
        .setDescription(name)
        .setColor(settings.embedColors.default);

    // TODO: add logger
    const reminderError = (err: Error) => console.error(k.red("Error while checking expired reminders:\n"), err);

    /** Edits `msg` to have the reschedule buttons and handles the listening and reminder rescheduling */
    const editReschedMsg = (msg: Message, rem: ReminderObj) => {
        const min = 60_000;
        const hr = min * 60;
        const day = hr * 24;

        /** null is used to pad to a new component row */
        const reschedBtns = [
            {
                label: "+ 2m",
                val: 2 * min,
            },
            {
                label: "+ 5m",
                val: 5 * min,
            },
            {
                label: "+ 15m",
                val: 15 * min,
            },
            {
                label: "+ 1h",
                val: hr,
            },
            {
                label: "+ 3h",
                val: 3 * hr,
            },
            {
                label: "+ 8h",
                val: 8 * hr,
            },
            {
                label: "+ 12h",
                val: 12 * hr,
            },
            {
                label: "+ 1d",
                val: day,
            },
            {
                label: "+ 3d",
                val: 3 * day,
            },
            {
                label: "+ 7d",
                val: 7 * day,
            },
            {
                val: 0,
                label: "Reschedule",
                btn: new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel("Reschedule"),
            },
            {
                val: 0,
                label: "Cancel",
                btn: new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Cancel"),
            },
            {
                val: 0,
                label: "Reset",
                btn: new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Reset"),
            },
        ].map((props) => (props ? {
            btn: new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel(props.label),
            ...props,
        } : null));

        const getEbd = (rem: ReminderObj) => new EmbedBuilder()
            .setColor(settings.embedColors.default)
            .setDescription(`Rescheduling the following reminder:\n> ${rem.name.replace(/\n/gm, "\n> ")}\n\nCurrent expiry: <t:${toUnix10(rem.dueTimestamp.getTime())}:F>`)
            .setFooter({ text: "Press any of the buttons below to add time onto this reminder." });

        const ebd = getEbd(rem);

        const slicedBtnsInput = reschedBtns.map((props) => props ? props.btn : null);
        const slicedBtns: ButtonBuilder[][] = [];
        while(slicedBtnsInput.length > 0)
            slicedBtns.push(slicedBtnsInput.splice(0, 5).filter(b => b !== null) as ButtonBuilder[]);
 
        const editReschedBm = new BtnMsg(ebd, slicedBtns as ButtonsTuple);

        const newReminder = { ...rem };

        /** Adds the `value` in milliseconds to the newReminder */
        const addValueToReminder = (value: number) => {
            newReminder.dueTimestamp = new Date(newReminder.dueTimestamp.getTime() + value);
            msg.edit({ ...editReschedBm.getMsgOpts(), content: "", embeds: [ getEbd(newReminder) ]});
        };

        /** Resets the rescheduled reminder time back to the original */
        const resetRescheduledReminder = () => {
            newReminder.dueTimestamp = new Date(rem.dueTimestamp.getTime());
            msg.edit({ ...editReschedBm.getMsgOpts(), content: "", embeds: [ getEbd(newReminder) ]});
        };

        /** Sets a new reminder */
        const setRescheduledReminder = async (rem: ReminderObj) => {
            const reminders = await getReminders(rem.userId);

            const reminderId = reminders && reminders.length > 0 && reminders.at(-1)
                ? reminders.at(-1)!.reminderId + 1
                : 1;

            if(!await getUser(rem.userId))
                await createNewUser(rem.userId);

            await setReminder(rem);

            return await msg.edit({
                ...useEmbedify(`I've rescheduled your reminder:\n> ${rem.name}\n> Now due on ${time(toUnix10(rem.dueTimestamp), "f")}\n\nID: \`${reminderId}\` • To list your reminders use \`/reminder list\``, settings.embedColors.success),
                content: "",
                components: [],
            });
        };

        /** Cancels the reminder rescheduling */
        const cancelRescheduling = () => {
            msg.edit({
                content: `🔔 <@${rem.userId}>, your reminder expired!`,
                embeds: [ getExpiredEbd(rem) ],
                components: [],
            });

            if(!editReschedBm.isDestroyed())
                editReschedBm.destroy();
        };

        let submitted = false, cancelled = false;

        editReschedBm.on("press", (btn, btInt) => {
            btInt.deferUpdate();
            const reschedBt = reschedBtns.find(b => b && b.label === btn.data.label);
            if(btInt.user.id === rem.userId && reschedBt) {
                if(btn.data.label === "Reschedule") {
                    submitted = true;
                    editReschedBm.destroy();
                    return setRescheduledReminder(newReminder);
                }
                else if(btn.data.label === "Cancel") {
                    cancelled = true;
                    return cancelRescheduling();
                }
                else if(btn.data.label === "Reset")
                    return resetRescheduledReminder();
                else
                    return addValueToReminder(reschedBt.val);
            }
        });

        ["timeout", "destroy"].forEach(evt =>
            editReschedBm.on(evt as "timeout", () => !submitted && !cancelled && cancelRescheduling())
        );

        msg.edit({
            ...editReschedBm.getMsgOpts(),
            content: "",
        });
    };

    /** Sends the expiry reminder in the guild and channel it was created in, but only if it is not private */
    const remindPublicly = async (rem: ReminderObj) => {
        try {
            if(rem.private)
                throw new Error("Can't send message in guild as reminder is private.");

            const guild = client.guilds.cache.find(g => g.id === rem.guild);
            const chan = guild?.channels.cache.find(c => c.id === rem.channel);

            if(chan && [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildForum].includes(chan.type))
            {
                const reschedBm = new BtnMsg(null, rescheduleBtn);

                const msg = (chan as TextBasedChannel).send({
                    ...reschedBm.getMsgOpts(),
                    content: `🔔 <@${rem.userId}>, your reminder expired!`,
                    embeds: [ getExpiredEbd(rem) ],
                });

                reschedBm.on("press", async (btn, btInt) => {
                    await btInt.deferUpdate();
                    if(btInt.user.id === rem.userId && btn.data.label === "Reschedule")
                        editReschedMsg(msg instanceof Promise ? await msg : msg, rem);
                });
            }
        }
        catch(err) {
            // TODO: track reminder "loss rate"
            //
            //   I  │ I I
            // ─────┼─────
            //  I I │ I ⌐¬

            err instanceof Error && reminderError(err);

            void err;
        }
        finally {
            try {
                await deleteReminder(rem.reminderId, rem.userId);
            }
            catch(err) {
                // TODO: see above

                err instanceof Error && reminderError(err);
            }
            finally {
                reminderCheckBuffer.delete(`${rem.userId}-${rem.reminderId}`);
            }
        }
    };

    for(const rem of expRems)
    {
        if(reminderCheckBuffer.has(`${rem.userId}-${rem.reminderId}`))
            continue;

        reminderCheckBuffer.add(`${rem.userId}-${rem.reminderId}`);

        const usr = client.users.cache.find(u => u.id === rem.userId);

        promises.push((async () => {
            if(!usr)
                return remindPublicly(rem);

            try
            {
                if(rem.private) {
                    const dm = await usr.createDM();
                    const reschedBm = new BtnMsg(null, rescheduleBtn);

                    const msg = await dm.send({
                        ...reschedBm.getMsgOpts(),
                        content: "🔔 Your reminder expired!",
                        embeds: [ getExpiredEbd(rem) ],
                    });

                    reschedBm.on("press", async (btn, btInt) => {
                        await btInt.deferUpdate();
                        if(btn.data.label === "Reschedule")
                            editReschedMsg(msg instanceof Promise ? await msg : msg, rem);
                    });

                    if(!dm || !msg)
                        return remindPublicly(rem);
                }
                else remindPublicly(rem);

                await deleteReminder(rem.reminderId, rem.userId);
                reminderCheckBuffer.delete(`${rem.userId}-${rem.reminderId}`);
            }
            catch(err)
            {
                return remindPublicly(rem);
            }
        })());
    }

    await Promise.allSettled(promises);
}
