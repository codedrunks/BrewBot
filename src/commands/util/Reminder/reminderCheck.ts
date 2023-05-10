// checks all expired reminders on interval to send the reminder message

import { Reminder as ReminderObj } from "@prisma/client";
import { createNewUser, deleteReminder, getExpiredReminders, getReminders, getUser, setReminder } from "@src/database/users";
import { settings } from "@src/settings";
import { BtnMsg, ButtonsTuple, toUnix10, useEmbedify } from "@src/utils";
import { ButtonBuilder, ButtonStyle, ChannelType, Client, EmbedBuilder, Message, TextBasedChannel, time } from "discord.js";
import k from "kleur";

let client: Client;

/** Max reminders per user (global) */
export const reminderLimit = 10;
/** Interval in ms between checking for expired reminders */
export const reminderCheckInterval = 2000;

/**
 * Contains all compound keys of reminders that are currently being checked.  
 * This is necessary because the check could take longer than `reminderCheckInterval` and check the same reminder twice.  
 * Format: `userId-reminderId`
 */
const reminderCheckBuffer = new Set<string>();

export function initReminderCheck(cl: Client) {
    client = cl;
    checkReminders();
    setInterval(() => checkReminders(), reminderCheckInterval);
}

const rescheduleBtn = new ButtonBuilder().setLabel("Reschedule").setStyle(ButtonStyle.Secondary).setEmoji("⏭️");

async function checkReminders()
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
