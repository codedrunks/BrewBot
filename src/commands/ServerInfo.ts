import { CommandInteraction, CommandInteractionOption, EmbedFieldData, MessageEmbed } from "discord.js";
import { Command } from "../Command";
import { settings } from "../settings";

export class ServerInfo extends Command
{
    constructor()
    {
        super({
            name: "server",
            desc: "Server information",
            subcommands: [
                {
                    name: "info",
                    desc: "Gives some information on this server",
                },
                {
                    name: "banner",
                    desc: "Shows the server banner",
                }
            ]
        });
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void> {
        const { guild } = int;
        if(!guild)
            return;

        switch(opt.name)
        {
        case "info":
        {
            const verifLevelMap = {
                NONE: "None (1/5)",
                LOW: "Low (2/5)",
                MEDIUM: "Medium (3/5)",
                HIGH: "High (4/5)",
                VERY_HIGH: "Very high (5/5)",
            };

            const fields: EmbedFieldData[] = [];

            const verifLevel = verifLevelMap[guild.verificationLevel];

            fields.push({ name: "Owner", value: `<@${guild.ownerId}>`, inline: true });
            fields.push({ name: "Created", value: guild.createdAt.toUTCString(), inline: false });
            fields.push({ name: "Verification level", value: verifLevel, inline: true });

            const allMembers = guild.memberCount;
            const membersNoBots = guild.members.cache.filter(m => !m.user.bot).size ?? undefined;
            const botMembers = allMembers && membersNoBots ? allMembers - membersNoBots : undefined;
            const onlineMembers = botMembers ? guild.members.cache.filter(m => m.presence?.status === "online" || m.presence?.status === "idle" || m.presence?.status === "dnd").size - botMembers : undefined;

            let memberCount = `Total: ${allMembers}`;
            if(onlineMembers) memberCount += `\nOnline: ${onlineMembers}`;
            if(botMembers) memberCount += `\nBots: ${botMembers}`;

            fields.push({ name: "Member count", value: memberCount, inline: true });
            fields.push({ name: "Role count", value: String(guild.roles.cache.size), inline: true });
            // TODO: add amount of assignable roles?

            const embed = new MessageEmbed()
                .setTitle(`**${guild.name}**`)
                .setColor(settings.embedColors.default)
                .setFields(fields);

            const iconUrl = guild.iconURL({ format: "png" });
            iconUrl && embed.setThumbnail(iconUrl);

            return await this.reply(int, embed, false);
        }
        case "banner":
        {
            const bannerUrl = guild.bannerURL({ format: "png" });

            if(!bannerUrl)
                return await this.reply(int, "This server doesn't have a banner.");

            const embed = new MessageEmbed()
                .setTitle(`**${guild.name}** banner`)
                .setColor(settings.embedColors.default)
                .setImage(bannerUrl);

            return await this.reply(int, embed, false);
        }
        default:
            return await this.reply(int, "Unrecognized subcommand.");
        }
    }
}
    
