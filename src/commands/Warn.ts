import { CommandInteraction, GuildMember, MessageEmbed } from "discord.js";
import { Command } from "../Command";
import { sendLogMsg } from "../botLogs";
import persistentData from "../persistentData";
import { settings } from "../settings";

export class Warn extends Command
{
    constructor()
    {
        super({
            name: "warn",
            desc: "Warns a user",
            perms: [ "MODERATE_MEMBERS" ],
            args: [
                {
                    name: "member",
                    desc: "Which member to warn",
                    type: "user",
                    required: true,
                },
                {
                    name: "reason",
                    desc: "The reason of the warning",
                    required: true,
                },
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const { guild } = int;

        const args = this.resolveArgs(int);
        const { member, reason } = args;

        const user = guild?.members.cache.find(m => m.id === member);

        if(!user)
            return await this.reply(int, "Couldn't find the provided member");

        const warnAmount = await this.addWarning(user, reason);

        return await this.reply(int, `Successfully warned the user. They have **${warnAmount}** warning${warnAmount != 1 ? "s" : ""}.`);
    }

    private async addWarning(user: GuildMember, reason: string): Promise<number>
    {
        const warnings = persistentData.get("warnings") ?? [];

        warnings.push({
            memberId: user.id,
            reason,
            timestamp: Date.now(),
        });

        const warningsAmt = warnings?.filter(w => w.memberId === user.id).length;

        await persistentData.set("warnings", warnings);

        const reasonList = `- ${warnings.map(w => `${w.reason} (${new Date(w.timestamp).toUTCString()})`).join("\n- ")}`;

        if(warningsAmt >= settings.warningsThreshold)
            await sendLogMsg(`Member <@!${user.id}> has been warned ${warningsAmt} time${warningsAmt != 1 ? "s" : ""}.\nPrevious warnings:\n${reasonList}`);

        try
        {
            const dmChannel = await user.createDM(true);

            const embed = new MessageEmbed()
                .setTitle(`Warning from ${user.guild.name}`)
                .setColor(settings.embedColors.default)
                .setDescription(`You have been warned for \`${reason}\` in the server **${user.guild.name}**.\n\nThese are your current warnings:\n${reasonList}`)
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
