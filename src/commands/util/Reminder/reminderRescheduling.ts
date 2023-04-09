// handles reminder rescheduling after the reminder message has been sent

import { Reminder as ReminderObj } from "@prisma/client";
import { ButtonInteraction, Client, Message } from "discord.js";

let client: Client;

export async function initReminderRescheduling(cl: Client) {
    client = cl;
}

/**
 * Initiates the process of rescheduling a reminder.  
 * In the initial state, the reminder is already deleted in the database and is only kept alive in memory for 15 minutes after expiry.
 * @param rem 
 * @param btnInt 
 */
export async function rescheduleReminder(rem: ReminderObj, msg: Message, btnInt: ButtonInteraction) {
    void "TODO";
    void [client, rem, btnInt];
}
