import { CommandInteraction, CommandInteractionOption, EmbedFieldData, MessageEmbed } from "discord.js";
import { Command } from "../../Command";
import { settings } from "../../settings";

export class Server extends Command
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
                },
                {
                    name: "icon",
                    desc: "Shows the server icon in full size",
                },
                {
                    name: "splash",
                    desc: "Shows the server's splash image (invite background)",
                },
                {
                    name: "invite",
                    desc: "Gives you the server's invite link",
                },
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

            guild.description && guild.description.length > 0 && fields.push({ name: "Description", value: guild.description, inline: true });

            fields.push({ name: "Owner", value: `<@${guild.ownerId}>`, inline: true });
            fields.push({ name: "Created", value: guild.createdAt.toUTCString(), inline: true });

            const verifLevel = verifLevelMap[guild.verificationLevel];
            fields.push({ name: "Verification level", value: verifLevel, inline: true });

            const allMembers = guild.memberCount;
            const botMembers = guild.members.cache.filter(m => m.user.bot).size ?? undefined;
            const onlineMembers = botMembers ? guild.members.cache.filter(m => (!m.user.bot && ["online", "idle", "dnd"].includes(m.presence?.status ?? "_"))).size : undefined;

            const publicTxtChannelsAmt = guild.channels.cache.filter(ch => ["GUILD_NEWS", "GUILD_TEXT"].includes(ch.type) && ch.permissionsFor(guild.roles.everyone).has("VIEW_CHANNEL")).size;
            const publicVoiceChannelsAmt = guild.channels.cache.filter(ch => ch.type === "GUILD_VOICE" && ch.permissionsFor(guild.roles.everyone).has("SPEAK")).size;

            let memberCount = `Total: ${allMembers}`;
            if(onlineMembers) memberCount += `\nOnline: ${onlineMembers}`;
            if(botMembers) memberCount += `\nBots: ${botMembers}`;

            fields.push({ name: "Member count", value: memberCount, inline: true });
            fields.push({ name: "Role count", value: String(guild.roles.cache.size), inline: true });
            fields.push({ name: "Public channels", value: `Text: ${publicTxtChannelsAmt}\nVoice: ${publicVoiceChannelsAmt}`, inline: true });

            const staticEmojiAmt = guild.emojis.cache.filter(em => !em.animated).size;
            const animatedEmojiAmt = guild.emojis.cache.filter(em => em.animated === true).size;

            fields.push({ name: "Emojis", value: `Total: ${staticEmojiAmt + animatedEmojiAmt}\nStatic: ${staticEmojiAmt}\nAnimated: ${animatedEmojiAmt}`, inline: true });
            // TODO: add amount of assignable roles?

            const embed = new MessageEmbed()
                .setTitle(`**${guild.name}**`)
                .setColor(settings.embedColors.default)
                .setFields(fields);

            const iconUrl = guild.iconURL({ format: "png", size: 1024 });
            iconUrl && embed.setThumbnail(iconUrl);

            return await this.reply(int, embed);
        }
        case "banner":
        {
            const bannerUrl = guild.bannerURL({ format: "png", size: 4096 });

            if(!bannerUrl)
                return await this.reply(int, "This server doesn't have a banner.", true);

            const embed = new MessageEmbed()
                .setTitle(`**${guild.name}** - banner:`)
                .setColor(settings.embedColors.default)
                .setImage(bannerUrl);

            return await this.reply(int, embed);
        }
        case "icon":
        {
            const iconUrl = guild.iconURL({ format: "png", size: 4096 });

            if(!iconUrl)
                return await this.reply(int, "This server doesn't have an icon.", true);

            const embed = new MessageEmbed()
                .setTitle(`**${guild.name}** - icon:`)
                .setColor(settings.embedColors.default)
                .setImage(iconUrl);

            return await this.reply(int, embed, false);
        }
        case "splash":
        {
            const splashUrl = guild.splashURL({ format: "png", size: 4096 });

            if(!splashUrl)
                return await this.reply(int, "This server doesn't have a splash image (invite background).", true);

            const embed = new MessageEmbed()
                .setTitle(`**${guild.name}** - splash image:`)
                .setColor(settings.embedColors.default)
                .setImage(splashUrl);

            return await this.reply(int, embed, false);
        }
        case "invite":
        {
            await guild.invites.fetch();

            const ivts = guild.invites.cache.filter(iv => iv.maxAge === 0);

            const vanityUrl = guild.vanityURLCode ? `https://discord.gg/${guild.vanityURLCode}` : undefined;
            const mostUsedIvts = ivts.sort((a, b) => a.uses && b.uses && a.uses > b.uses ? 1 : -1);

            const iv = mostUsedIvts.at(0);

            if(!vanityUrl && !iv)
                return await this.reply(int, "Couldn't find an invite. Please create a new one or ask the moderators to create one.", true);

            const link = vanityUrl ? vanityUrl : iv?.url;
            const chan = iv?.channel.id ? `\nChannel: <#${iv.channel.id}>` : undefined;
            const uses = iv?.uses ? `\nUses: ${iv.uses}${typeof iv.maxUses === "number" && iv.maxUses > 0 ? ` / ${iv.maxUses}` : ""}` : undefined;

            const embed = new MessageEmbed()
                .setTitle(`**${guild.name}** - invite:`)
                .setColor(settings.embedColors.default)
                .setDescription(`**[${link}](${link})**${chan || uses ? "\n" : ""}${chan}${uses}`);

            return await this.reply(int, embed, true);
        }
        }
    }
}
    
