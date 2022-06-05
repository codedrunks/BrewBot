import { Client, CommandInteraction, CommandInteractionOption, MessageEmbed } from "discord.js";
import parseRelativeTime from "parse-relative-time";
import { readableArray } from "svcorelib";
import { Command } from "../Command";
import persistentData from "../persistentData";
import { settings } from "../settings";

export class Reminder extends Command
{
    constructor(client: Client)
    {
        super({
            name: "reminder",
            desc: "Set a reminder to get DMed after a certain time passed",
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
                            desc: "How many days",
                            type: "number",
                            min: 1,
                            max: 364,
                        },
                        {
                            name: "hours",
                            desc: "How many hours",
                            type: "number",
                            min: 1,
                            max: 23,
                        },
                        {
                            name: "minutes",
                            desc: "How many minutes",
                            type: "number",
                            min: 1,
                            max: 59,
                        },
                        {
                            name: "seconds",
                            desc: "How many seconds",
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
                },
            ]
        });

        // since the constructor is called exactly once at startup, this should work just fine
        this.checkReminders(client);
        setInterval(() => this.checkReminders(client), 1000);
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        switch(opt.name)
        {
        case "set":
        {
            if(!int.member || !int.guild) return;

            const { member, guild } = int;

            const args = { name: "", days: 0, hours: 0, minutes: 0, seconds: 0, ...this.resolveArgs(int) };
            const { name } = args;
            const timeStrings = [];

            for(const key of ["days", "hours", "minutes", "seconds"])
                timeStrings.push(`${parseInt(String(args[key as keyof typeof args]))} ${key}`);

            const dueInMs = timeStrings.reduce((acc, cur) => acc + parseRelativeTime(cur), 0);
            const dueTimestamp = Date.now() + dueInMs;

            const reminders = persistentData.get("reminders");
            reminders?.push({ memberId: member.user.id, guildId: guild.id, name, dueTimestamp });
            reminders && await persistentData.set("reminders", reminders);

            return await this.reply(int, `I've set a timer with the name \`${name}\`.\nIt will expire in **${readableArray(timeStrings)}** (${new Date(dueTimestamp).toUTCString()})\n\nTo list your reminders, use \`/reminder list\`\nTo delete reminders, use \`/reminder delete\``);
        }
        case "list":
        {
            const reminders = persistentData.get("reminders");
            const ownReminders = reminders?.filter(rem => rem.memberId === int.member?.user.id);

            if(!ownReminders || ownReminders.length === 0)
                return await this.reply(int, "You don't have any set reminders. Create a new one with `/reminder set`");

            const remList = ownReminders.reduce((acc, cur) => acc += `\n**${cur.name}**\n${new Date(cur.dueTimestamp).toUTCString()}\n`, "");

            const embed = new MessageEmbed()
                .setTitle("Your reminders")
                .setColor(settings.embedColors.default)
                .setDescription(remList);

            const avatar = int.guild?.members.cache.find(m => m.id === int.member?.user.id)?.avatarURL({ format: "png", size: 1024 });

            if(avatar)
                embed.setThumbnail(avatar);

            return await this.reply(int, embed);
        }
        case "delete":
        {
            break;
        }
        default:
            return await this.reply(int, "Unrecognized subcommand.");
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

                const guild = client.guilds.cache.find(g => g.id === rem.guildId);
                const member = guild?.members.cache.find(m => m.id === rem.memberId);

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