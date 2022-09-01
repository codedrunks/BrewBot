import { CommandInteraction, GuildMember, EmbedBuilder, ApplicationCommandOptionType, User, CommandInteractionOption } from "discord.js";
import { Command } from "@src/Command";
import { settings } from "@src/settings";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { embedify, PageEmbed, toUnix10 } from "@src/utils";
import { addWarning, deleteWarnings, getWarnings } from "@src/database/users";
import { allOfType } from "svcorelib";

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
                            desc: "One or multiple warning IDs separated by comma. Find IDs with /warning list. \"all\" to delete all.",
                            type: ApplicationCommandOptionType.String,
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
            }
        }
        catch(err)
        {
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
            return this.noWarnsYet(int, member);

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
        const { guild } = int;

        const member = this.findMember(int, int.options.getUser("member", true));

        if(!member || !guild)
            return await this.reply(int, embedify("Couldn't find the provided member.", settings.embedColors.error), true);

        await this.deferReply(int, true);

        const warnings = await getWarnings(guild.id, member.id);

        if(!warnings || warnings.length === 0)
            return this.noWarnsYet(int, member);

        const idsArg = int.options.get("warning_ids", true).value as string;

        const argWrong = () => this.editReply(int, embedify(this.listHint, settings.embedColors.error));

        const ids = [];
        let type = "";

        if(idsArg.match(/^\s*\d\s*$/))
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
        else if(idsArg.toLowerCase().includes("all"))
        {
            type = "a";
            warnings.map(w => w.warningId).forEach(id => ids.push(id));
        }
        else
            return argWrong();

        try
        {
            await deleteWarnings(member.id, ids);

            for(const id of ids)
                if(!warnings.find(w => w.warningId === id))
                    throw new Error(`Couldn't find a warning with the ID ${id}`); // kinda dirty but I am tired

            return this.editReply(int, embedify(`Successfully deleted ${ids.length} warning${ids.length === 1 ? "" : "s"} of <@${member.id}>.`));
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
