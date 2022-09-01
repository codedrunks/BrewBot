import { CommandInteraction, GuildMember, EmbedBuilder, ApplicationCommandOptionType, User, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import persistentData from "@src/persistentData";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { embedify, PageEmbed, toUnix10 } from "@src/utils";
import { addWarning, getWarnings } from "@src/database/users";

export class Warning extends Command
{
    constructor()
    {
        super({
            name: "warning",
            desc: "Manage your members' warnings",
            category: "mod",
            subcommands: [
                {
                    name: "add",
                    desc: "Adds a new warning to a member",
                    args: [
                        {
                            name: "member",
                            desc: "Which member to warn",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                        {
                            name: "reason",
                            desc: "The reason of the warning",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: "list",
                    desc: "Lists all warnings of a member",
                    args: [
                        {
                            name: "member",
                            desc: "Which member to warn",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                },
                {
                    name: "delete",
                    desc: "Deletes warnings of a member",
                    args: [
                        {
                            name: "member",
                            desc: "Which member to warn",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                }
            ],
            memberPerms: [ PermissionFlagsBits.ModerateMembers ],
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption): Promise<void>
    {
        switch(opt.name)
        {
        case "add":
            return this.addWarning(int);
        case "list":
            return this.listWarnings(int);
        case "delete":
            return this.deleteWarning(int);
        }
    }

    private findMember(int: CommandInteraction, user: User): GuildMember | undefined
    {
        return int.guild?.members.cache.find(m => m.id === user.id);
    }

    //#SECTION add
    private async addWarning(int: CommandInteraction)
    {
        const { guild } = int;

        const reason = int.options.get("reason", true).value as string;

        const member = this.findMember(int, int.options.getUser("member", true));

        if(!member || !guild)
            return await this.reply(int, embedify("Couldn't find the provided member.", settings.embedColors.error), true);

        await this.deferReply(int, true);

        try
        {
            await addWarning(guild.id, member.id, int.user.id, reason);

            const allWarnings = await getWarnings(guild.id, member.id);

            // const bold = warnAmount >= settings.warningsThreshold ? "**" : "";
            const bold = "**";
            return this.editReply(int, embedify(`Successfully warned <@${member.id}>\nThey now have ${bold}${allWarnings.length} warning${allWarnings.length != 1 ? "s" : ""}${bold} in total.`, settings.embedColors.default));
        }
        catch(err)
        {
            return this.editReply(int, embedify(`Couldn't warn this user due to an error:\n${err}`, settings.embedColors.error));
        }
    }

    //#SECTION list
    private async listWarnings(int: CommandInteraction)
    {
        const { guild } = int;

        const member = this.findMember(int, int.options.getUser("member", true));

        if(!member || !guild)
            return await this.reply(int, embedify("Couldn't find the provided member.", settings.embedColors.error), true);

        await this.deferReply(int, true);

        const warnings = await getWarnings(guild.id, member.id);

        if(!warnings || warnings.length === 0)
            return this.editReply(int, embedify(`<@${member.id}> didn't get warned yet.`, settings.embedColors.default));

        const warningsPerPage = 5;

        const pages: EmbedBuilder[] = [];
        const warningsRest = [...warnings];

        //TODO:FIXME:
        const avatar = member.avatarURL();

        while(warningsRest.length !== 0)
        {
            const slice = warningsRest.splice(0, warningsPerPage);

            pages.push(new EmbedBuilder()
                .setTitle(`Showing warnings of **${member.user.username}**:`)
                .setDescription([
                    `Member: <@${member.id}>`,
                    `Warnings received: ${warnings.length}\n`,
                    slice.map(w => `> **\`${w.warningId}\`** - warned by <@${w.warnedBy}> on <t:${toUnix10(w.timestamp)}:f>\n> **Reason:** ${w.reason}`)
                        .join("\n\n"),
                    "\nTo delete warnings, use `/warning delete`",
                ].join("\n"))
                .setColor(settings.embedColors.default)
                .setThumbnail(avatar)
            );
        }

        if(pages.length > 1)
        {
            const pe = new PageEmbed(pages, int.user.id, {
                allowAllUsersTimeout: 1000 * 60,
                goToPageBtn: pages.length >= 5,
            });

            await pe.useInt(int);
        }
        else
            return this.editReply(int, pages[0]);
    }

    //#SECTION delete
    private async deleteWarning(int: CommandInteraction)
    {
        void int;
    }

    private async addWarningOld(user: GuildMember, reason: string): Promise<number>
    {
        const allWarnings = persistentData.get("warnings") ?? [];

        let warn = allWarnings.find(w => w.member === user.id && w.guild === user.guild.id);

        const newWarning = { reason, timestamp: Date.now() };

        if(!warn)
        {
            warn = { guild: user.guild.id, member: user.id, warnings: [newWarning] };
            allWarnings.push(warn);
        }
        else
            allWarnings.find(w => w.guild === warn?.guild && w.member === warn.member)?.warnings.push(newWarning);

        const warningsAmt = warn.warnings.length;

        await persistentData.set("warnings", allWarnings);

        const reasonList = warn.warnings.reverse().map(w => {
            const d = new Date(w.timestamp);
            return `> ${d.toLocaleDateString()} | ${d.toLocaleTimeString()}\n> Reason: ${w.reason}\n`;
        }).join("\n");

        // TODO(sv): grab log channel from guild settings in db
        // if(warningsAmt >= settings.warningsThreshold)
        // {
        //     const baseDesc = `Member <@!${user.id}> has been warned ${warningsAmt} time${warningsAmt != 1 ? "s" : ""}.\nPrevious warnings:\n\n${reasonList}\n\n`;

        //     const logMsg = await sendLogMsg(new EmbedBuilder()
        //         .setTitle("Sussy baka alert")
        //         .setColor(settings.embedColors.warning)
        //         .setDescription(baseDesc + `To ban the member, react ${votesToBan} time${votesToBan !== 1 ? "s" : ""} with the ban hammer within 24 hours.`)
        //     );
               
        //     if(logMsg)
        //     {
        //         await logMsg.react("<:banhammer:500792756281671690>");

        //         const coll = logMsg.createReactionCollector({
        //             filter: (react, usr) => (react.emoji.id === "500792756281671690" && !usr.bot && logMsg.guild?.members.cache.find(m => m.id === usr.id)?.permissions.has(PermissionFlagsBits.BanMembers)) ?? false,
        //             max: votesToBan,
        //             time: /*24 * 60 * 60*/ 10 * 1000,
        //         });

        //         coll.on("end", async (collected) => {
        //             !coll.ended && coll.stop();

        //             if(collected.size >= votesToBan)
        //             {
        //                 try
        //                 {
        //                     const dmChan = await user.createDM(true);

        //                     dmChan && dmChan.send({ embeds: [ new EmbedBuilder()
        //                         .setTitle("You have been banned")
        //                         .setColor(settings.embedColors.error)
        //                         .setDescription(`You have been banned from the server **${logMsg.guild?.name}** after being warned ${warningsAmt} times:\n\n${reasonList}`)
        //                     ]});

        //                     await user.ban({ reason: `<${this.botName ?? "bot"}> Banned after being warned ${warningsAmt} times | ${new Date().toUTCString()}` });

        //                     await logMsg.reply(`${votesToBan} ${votesToBan === 1 ? "person" : "people"} voted to ban, so the member was banned.`);
        //                 }
        //                 catch(err: unknown)
        //                 {
        //                     err instanceof Error && await logMsg.reply(`Couldn't ban that user${err.message ? `: ${err.message}` : " due to an error"}`);
        //                 }
        //             }
        //         });
        //     }
        // }

        try
        {
            const dmChannel = await user.createDM(true);

            const embed = new EmbedBuilder()
                .setTitle(`Warning from ${user.guild.name}`)
                .setColor(settings.embedColors.warning)
                .setDescription(`You have been warned for \`${reason}\` in the server **${user.guild.name}**.\n\nThese are your current warnings:\n\n${reasonList}`)
                .setFooter({ text: "For further questions please contact the moderators" });

            await dmChannel.send({ embeds: [embed] });
        }
        catch(err)
        {
            void err;
        }

        return warningsAmt;
    }
}
