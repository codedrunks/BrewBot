import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { halves } from "svcorelib";
import { Command } from "@src/Command";
import { embedify, PageEmbed } from "@src/utils";
import { settings } from "@src/settings";

export class Whois extends Command
{
    constructor()
    {
        super({
            name: "whois",
            desc: "Lists the members that have a specified role",
            category: "util",
            args: [
                {
                    name: "role",
                    desc: "The role to list the members of",
                    type: ApplicationCommandOptionType.Role,
                    required: true,
                },
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { guild } = int;

        if(!guild)
            return this.reply(int, embedify("This command can only be used in a server.", settings.embedColors.error), true);

        const role = int.options.get("role", true).role;

        await this.deferReply(int);

        const roles = await guild.roles.fetch();
        await guild.members.fetch({ withPresences: false });

        const guildRole = roles.find(r => r.id === role?.id);

        if(!guildRole)
            return this.editReply(int, embedify("Couldn't find this role.", settings.embedColors.error));

        if(guildRole.members.size === 0)
            return this.editReply(int, embedify(`Nobody has the role <@&${guildRole.id}> yet.`, settings.embedColors.error));

        const allMembers = [
            ...guildRole.members
                .sort((a, b) => (a.nickname ?? a.user.username).localeCompare(b.nickname ?? b.user.username))
                .map(m => `<@${m.id}>`)
        ];
        const membersPerPage = 30;
        const pages: EmbedBuilder[] = [];
        const totalPages = Math.ceil(guildRole.members.size / membersPerPage);

        while(allMembers.length > 0)
        {
            const memberIdHalves = halves(allMembers.splice(0, membersPerPage)).filter(h => h && h.length > 0);

            totalPages > 1 && memberIdHalves[0].push("\u200B");

            const ebd = new EmbedBuilder()
                .setTitle(`Who is in **${guildRole.name}**:`)
                .setDescription(`The role <@&${guildRole.id}> has ${guildRole.members.size} member${guildRole.members.size === 1 ? "" : "s"}${totalPages > 1 ? " in total." : ":"}`)
                .setColor(settings.embedColors.default)
                .addFields(memberIdHalves.map(memIds => ({ name: "\u200B", value: memIds.join("\n"), inline: true })));
            totalPages > 1 && ebd.setFooter({ text: `(${pages.length + 1}/${totalPages}) - showing ${membersPerPage} per page` });

            pages.push(ebd);
        }

        if(pages.length > 1)
        {
            // TODO(sv): add a messageCollector to jump to beginning letters or to find users, maybe a PageEmbed builtin option?
            const pe = new PageEmbed(pages, int.user.id, {
                allowAllUsersTimeout: 60 * 1000,
                goToPageBtn: pages.length > 5,
            });

            pe.on("error", (err) => console.log(err));

            await pe.useInt(int);
        }
        else
        {
            await int.editReply({
                embeds: pages,
            });
        }
    }
}
