import { Client, CommandInteraction, CommandInteractionOption, MessageEmbed } from "discord.js";
import { Command } from "@src/Command";
import persistentData from "@src/persistentData";
import { settings } from "@src/settings";
import { CommandMeta } from "@src/types";
import { time } from "@discordjs/builders";
import { getReminders, setReminder } from "@src/database/users";
import { embedify } from "@src/utils";

export class Reminder extends Command
{
    constructor(client: Client | CommandMeta)
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
                            required: true,
                        },
                        {
                            name: "days",
                            desc: "In how many days",
                            type: "number",
                            min: 1,
                            max: 364,
                        },
                        {
                            name: "hours",
                            desc: "In how many hours",
                            type: "number",
                            min: 1,
                            max: 23,
                        },
                        {
                            name: "minutes",
                            desc: "In how many minutes",
                            type: "number",
                            min: 1,
                            max: 59,
                        },
                        {
                            name: "seconds",
                            desc: "In how many seconds",
                            type: "number",
                            min: 1,
                            max: 59,
                        },
                    ]
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
                            desc: "The name of the reminder or the ID shown with /reminder list",
                            required: true,
                        }
                    ]
                },
            ]
        });

        if(!Command.isCommandMeta(client))
        {
            // since the constructor is called exactly once at startup, this should work just fine
            this.checkReminders(client);
            setInterval(() => this.checkReminders(client), 1000);
        }
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        const getTime = (timeObj: Record<"days"|"hours"|"minutes"|"seconds", number>) => {
            return 1000 * timeObj.seconds
                + 1000 * 60 * timeObj.minutes
                + 1000 * 60 * 60 * timeObj.hours
                + 1000 * 60 * 60 * 24 * timeObj.days;
        };

        switch(opt.name)
        {
        case "set":
        {
            if(!int.member || !int.guild || !int.channel)
            {
                // TODO:
                return await this.reply(int, embedify("Setting a reminder outside of a server is not yet supported.", settings.embedColors.error), true);
            }

            const { member, guild, channel } = int;

            const args = {
                name: int.options.getString("name", true),
                days: int.options.getNumber("days", false) ?? 0,
                hours: int.options.getNumber("hours", false) ?? 0,
                minutes: int.options.getNumber("minutes", false) ?? 0,
                seconds: int.options.getNumber("seconds", false) ?? 0,
            };

            const { name, ...timeObj } = args;

            const dueInMs = getTime(timeObj);
            const dueTimestamp = Date.now() + dueInMs;

            if(dueInMs < 1000 * 5)
                return await this.reply(int, embedify("Please enter at least five seconds.", settings.embedColors.error), true);

            const reminders = await getReminders(member.user.id);

            let reminderId = 0;
            if(reminders)
            {
                const rem = reminders.sort((a, b) => a.reminderId < b.reminderId ? 1 : -1).at(0);
                reminderId = rem ? rem.reminderId + 1 : 0;
            }

            await setReminder({
                name: args.name,
                guild: guild.id,
                userId: member.user.id,
                channel: channel.id,
                reminderId,
                dueTimestamp,
            });

            return await this.reply(int, `I've set a timer with the name \`${name}\`.\nExpires: ${time(dueTimestamp, "F")} (${new Date(dueTimestamp).toUTCString()})\n\nTo list your reminders, use \`/reminder list\`\nTo delete reminders, use \`/reminder delete\``, true);
        }
        case "list":
        {
            const reminders = persistentData.get("reminders");
            const ownReminders = reminders?.filter(rem => rem.member === int.member?.user.id);

            if(!ownReminders || ownReminders.length === 0)
                return await this.reply(int, "You don't have any set reminders. Create a new one with `/reminder set`", true);

            const remList = ownReminders.reduce((acc, cur) => acc += `\n**${cur.name}**\n${new Date(cur.dueTimestamp).toUTCString()}\n`, "");

            const embed = new MessageEmbed()
                .setTitle("Your reminders")
                .setColor(settings.embedColors.default)
                .setDescription(remList);

            const avatar = int.guild?.members.cache.find(m => m.id === int.member?.user.id)?.avatarURL({ format: "png", size: 1024 });

            if(avatar)
                embed.setThumbnail(avatar);

            return await this.reply(int, embed, true);
        }
        case "delete":
        {
            const rem = int.options.getString("reminder", true);
            if(rem.match(/d+/))
            {
                console.log();
            }
            else
            {
                console.log();
            }
            break;
        }
        }
    }

    async checkReminders(client: Client)
    {
        const now = Date.now();
        const reminders = persistentData.get("reminders");

        if(!reminders || reminders.length === 0) return;

        let atLeastOneDue = false;

        for(const rem of reminders)
        {
            if(rem.dueTimestamp <= now)
            {
                atLeastOneDue = true;

                const guild = client.guilds.cache.find(g => g.id === rem.guild);
                const member = guild?.members.cache.find(m => m.id === rem.member);

                if(member)
                {
                    try
                    {
                        const dmChannel = await member.createDM();
                        dmChannel.send(`\\*Beep boop\\*, your reminder with the name \`${rem.name}\` has expired!`);
                    }
                    catch(err)
                    {
                        void err;
                    }
                }
            }
        }

        atLeastOneDue && await persistentData.set("reminders", reminders.filter(r => r.dueTimestamp <= now));
    }
}
