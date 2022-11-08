import { CommandInteraction, GuildMember, EmbedBuilder, ApplicationCommandOptionType, User, CommandInteractionOption, TextChannel, ButtonBuilder, ButtonStyle, ButtonInteraction } from "discord.js";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { BtnMsg, embedify, emojis, PageEmbed, toUnix10, useEmbedify } from "@src/utils";
import { addWarning, createNewMember, deleteWarnings, getMember, getWarnings } from "@src/database/users";
import { Warning as WarningObj } from "@prisma/client";
import { allOfType } from "svcorelib";
import { createNewGuild, getGuild, getGuildSettings } from "@src/database/guild";

export class Warning extends Command
{
    private listHint = "Please enter either a single warning ID number, or multiple ID numbers separated by a comma.\nTo get the ID numbers, please use the command `/warning list`";

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
                            desc: "Which member to delete warnings of",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                        {
                            name: "warning_ids",
                            desc: "One or multiple warning IDs (separated by comma). Find IDs with /warning list",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: "delete_all",
                    desc: "Deletes all warnings of a member",
                    args: [
                        {
                            name: "member",
                            desc: "Which member to delete all warnings of",
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
        let action = "run the command";
        try
        {
            if(!int.guild)
                return await this.reply(int, embedify("This command can only be used in a server.", settings.embedColors.error), true);

            await this.deferReply(int, true);

            const member = await getMember(int.guild.id, int.user.id);

            if(!member)
            {
                const guild = await getGuild(int.guild.id);

                if(!guild)
                    await createNewGuild(int.guild.id);

                await createNewMember(int.guild.id, int.user.id);
            }

            switch(opt.name)
            {
            case "add":
                action = "add a warning";
                return this.addWarning(int);
            case "list":
                action = "list warnings";
                return this.listWarnings(int);
            case "delete":
                action = "delete";
                return this.deleteWarning(int);
            case "delete_all":
                action = "delete all";
                return this.deleteWarning(int, true);
            }
        }
        catch(err)
        {
            console.log(err);
            const ebd = embedify(`Couldn't ${action} due to an error:\n${err}`, settings.embedColors.error);

            if(int.replied || int.deferred)
                this.editReply(int, ebd);
            else
                this.reply(int, ebd, true);
        }
    }

    private findMember(int: CommandInteraction, user: User): GuildMember | undefined
    {
        return int.guild?.members.cache.find(m => m.id === user.id);
    }

    private noWarnsYet(int: CommandInteraction, member: GuildMember)
    {
        this.editReply(int, embedify(`The member <@${member.id}> didn't get warned yet.`, settings.embedColors.default));
    }

    //#SECTION add
    private async addWarning(int: CommandInteraction)
    {
        const { guild } = int;

        const reason = int.options.get("reason", true).value as string;

        const member = this.findMember(int, int.options.getUser("member", true));

        if(!member || !guild)
            return await this.editReply(int, embedify("Couldn't find the provided member.", settings.embedColors.error));

        try
        {
            const gldSett = await getGuildSettings(guild.id);

            await addWarning(guild.id, member.id, int.user.id, reason);

            const allWarnings = await getWarnings(guild.id, member.id);

            let dmError = false;

            try
            {
                const dm = await member.createDM(true);

                const headerEbd = new EmbedBuilder()
                    .setTitle("You've received a warning")
                    .setDescription(`You have been warned in the server [${guild.name}](https://discord.com/channels/${guild.id})\n**Reason:** ${reason}\n\n${allWarnings.length === 1 ? "This is your first warning" : `You have been warned ${allWarnings.length} times`} in this server.`)
                    .setFooter({ text: "If you have questions, please contact the moderators of the server." })
                    .setColor(settings.embedColors.warning);

                const warningPages: EmbedBuilder[] = [];
                const warningsRest = [...allWarnings.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1)];

                const warningsPerPage = 10;
                const maxPage = Math.ceil(allWarnings.length / warningsPerPage);

                while(warningsRest.length !== 0)
                {
                    const slice = warningsRest.splice(0, warningsPerPage);

                    const e = new EmbedBuilder()
                        .setDescription(slice.map(w => `> Warned on <t:${toUnix10(w.timestamp)}:f>\n> **Reason:** ${w.reason}`).join("\n\n"))
                        .setColor(settings.embedColors.warning);

                    warningPages.length === 0 && e.setTitle("These are all your warnings:");
                    maxPage > 1 && e.setFooter({ text: `(${warningPages.length + 1}/${maxPage})` });

                    warningPages.push(e);
                }

                dm.send({ embeds: [headerEbd, ...(allWarnings.length > 1 ? warningPages : [])] });
            }
            catch(err)
            {
                dmError = true;
                void err;
            }

            if(allWarnings.length === gldSett?.warningThreshold && gldSett?.botLogChannel)
            {
                const blChannel = guild.channels.cache.find(c => c.id === gldSett.botLogChannel) as TextChannel;

                const descParts = [
                    `The member <@${member.id}> now has ${allWarnings.length} warning${allWarnings.length === 1 ? "" : "s"} in total.`,
                    `\nTo ban them, ${gldSett.banVoteAmt} reaction vote${gldSett.banVoteAmt === 1 ? " is" : "s are"} required.`,
                    "Ignore this message to not ban the member.",
                ];
                dmError && descParts.push("\nI tried to notify the member but they have their DMs disabled.");

                const ebd = new EmbedBuilder()
                    .setTitle("Naughty alert")
                    .setColor(settings.embedColors.warning)
                    .setAuthor({
                        name: member.user.username,
                        iconURL: member.avatarURL() ?? member.displayAvatarURL(),
                    })
                    .setDescription(descParts.join("\n"));

                const bm = new BtnMsg(ebd,
                    new ButtonBuilder()
                        .setLabel("Show warnings")
                        .setStyle(ButtonStyle.Primary)
                );

                const alertMsg = await bm.sendIn(blChannel);

                bm.on("press", async (btn, int) => {
                    await this.showWarnings(member, allWarnings, int, false);

                    bm.destroy();
                });

                bm.on("destroy", () => alertMsg.edit(bm.getMsgOpts()));

                alertMsg.react(emojis.banHammer);

                const coll = alertMsg.createReactionCollector({
                    filter: (re, usr) => {
                        if(re.emoji.id !== "1015632683096871055" || usr.bot)
                            return false;

                        const member = guild.members.cache.find(m => m.id === usr.id);

                        return member?.permissions.has(PermissionFlagsBits.BanMembers) ?? false;
                    },
                    max: gldSett.banVoteAmt,
                });

                coll.on("end", async () => {
                    try
                    {
                        await member.ban({
                            reason: `[BrewBot] Banned${gldSett.banVoteAmt > 1 ? ` by ${gldSett.banVoteAmt} moderators` : ""} for having ${allWarnings.length} warning${allWarnings.length === 1 ? "" : "s"}`,
                        });

                        await alertMsg.reply(useEmbedify(`Successfully banned <@${member.id}>`, settings.embedColors.default));
                    }
                    catch(err)
                    {
                        await alertMsg.reply(useEmbedify(`I can't ban a user as noble as <@${member.id}>`, settings.embedColors.error));
                    }
                });
            }

            const bold = gldSett?.warningThreshold && allWarnings.length >= gldSett.warningThreshold ? "**" : "";
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
            return await this.editReply(int, embedify("Couldn't find the provided member.", settings.embedColors.error));

        const warnings = await getWarnings(guild.id, member.id);

        if(!warnings || warnings.length === 0)
            return this.noWarnsYet(int, member);

        this.showWarnings(member, warnings, int);
    }

    private async showWarnings(member: GuildMember, warnings: WarningObj[], int: CommandInteraction | ButtonInteraction, ephemeral = true)
    {
        !int.deferred && await int.deferReply({ ephemeral });

        const warningsPerPage = 5;

        const pages: EmbedBuilder[] = [];
        const warningsRest = [...warnings];

        const avatar = member.avatarURL() ?? member.displayAvatarURL();

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
                .setColor(settings.embedColors.warning)
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
        else if(int.replied || int.deferred)
            return this.editReply(int as CommandInteraction, pages[0]);
        else
            return this.reply(int as CommandInteraction, pages[0]);
    }

    //#SECTION delete
    private async deleteWarning(int: CommandInteraction, deleteAll = false)
    {
        const { guild } = int;

        const member = this.findMember(int, int.options.getUser("member", true));

        if(!member || !guild)
            return await this.editReply(int, embedify("Couldn't find the provided member.", settings.embedColors.error));

        const warnings = await getWarnings(guild.id, member.id);

        if(!warnings || warnings.length === 0)
            return this.noWarnsYet(int, member);

        const idsArg = deleteAll ? "_" : int.options.get("warning_ids", true).value as string;

        const argWrong = () => this.editReply(int, embedify(this.listHint, settings.embedColors.error));

        const ids = [];
        let type = "";

        if(deleteAll)
        {
            type = "a";
            warnings.forEach(w => ids.push(w.warningId));
        }
        else if(idsArg.match(/^\s*\d\s*$/))
        {
            type = "1";
            ids.push(parseInt(idsArg));
        }
        else if(idsArg.match(/^[\d,\s]+$/))
        {
            type = "n";
            const parsedId = idsArg.replace(/\s/g, "").split(/[.,،，٫٬]/).map(v => parseInt(v));
            if(!allOfType(parsedId, "number") || parsedId.find(v => isNaN(v)))
                return argWrong();

            parsedId.forEach(id => ids.push(id));
        }
        else
            return await argWrong();

        try
        {
            await deleteWarnings(member.id, guild.id, ids);

            for(const id of ids)
                if(!warnings.find(w => w.warningId === id))
                    throw new Error(`Couldn't find a warning with the ID ${id}`); // kinda dirty but I am tired

            return this.editReply(int, embedify(`Successfully deleted ${ids.length !== 1 && type === "a" ? "all " : ""}${ids.length} warning${ids.length === 1 ? "" : "s"} of <@${member.id}>`));
        }
        catch(err)
        {
            let text = "";
            if(type === "n")
                text = `find warnings for one or more of these IDs.\n${this.listHint}`;
            if(type === "a")
                text = `delete all warnings due to an error:\n${err}`;
            if(type === "1")
                text = `find a warning with this ID.\n${this.listHint}`;

            return this.editReply(int, embedify(`Couldn't ${text}`, settings.embedColors.error));
        }
    }
}
