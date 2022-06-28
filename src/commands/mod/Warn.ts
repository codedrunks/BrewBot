import { Client, CommandInteraction, GuildMember, MessageEmbed } from "discord.js";
import { Command } from "@src/Command";
import { sendLogMsg } from "@src/botLogs";
import persistentData from "@src/persistentData";
import { settings } from "@src/settings";
import { PermissionFlagsBits } from "discord-api-types/v10";

const votesToBan = settings.moderation.votesToBan;

export class Warn extends Command
{
    private botName?: string;

    constructor(client: Client)
    {
        super({
            name: "warn",
            desc: "Warns a user",
            category: "mod",
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
            ],
            perms: [ "MODERATE_MEMBERS" ],
            memberPerms: [ PermissionFlagsBits.ModerateMembers ],
        });

        this.botName = client.user?.username;
    }

    async run(int: CommandInteraction): Promise<void> {
        const { guild } = int;

        const args = this.resolveArgs(int);
        const { member, reason } = args;

        const user = guild?.members.cache.find(m => m.id === member);

        if(!user)
            return await this.reply(int, "Couldn't find the provided member", true);

        const warnAmount = await this.addWarning(user, reason);

        const bold = warnAmount >= settings.warningsThreshold ? "**" : "";
        return await this.reply(int, `Successfully warned the user. They now have ${bold}${warnAmount} warning${warnAmount != 1 ? "s" : ""}${bold} in total.`, true);
    }

    private async addWarning(user: GuildMember, reason: string): Promise<number>
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

        if(warningsAmt >= settings.warningsThreshold)
        {
            const baseDesc = `Member <@!${user.id}> has been warned ${warningsAmt} time${warningsAmt != 1 ? "s" : ""}.\nPrevious warnings:\n\n${reasonList}\n\n`;

            const logMsg = await sendLogMsg(new MessageEmbed()
                .setTitle("Sussy baka alert")
                .setColor(settings.embedColors.warning)
                .setDescription(baseDesc + `To ban the member, react ${votesToBan} time${votesToBan !== 1 ? "s" : ""} with the ban hammer within 24 hours.`)
            );
               
            if(logMsg)
            {
                await logMsg.react("<:banhammer:500792756281671690>");

                const coll = logMsg.createReactionCollector({
                    filter: (react, usr) => (react.emoji.id === "500792756281671690" && !usr.bot && logMsg.guild?.members.cache.find(m => m.id === usr.id)?.permissions.has("BAN_MEMBERS")) ?? false,
                    max: votesToBan,
                    time: /*24 * 60 * 60*/ 10 * 1000,
                });

                coll.on("end", async (collected) => {
                    !coll.ended && coll.stop();

                    if(collected.size >= votesToBan)
                    {
                        try
                        {
                            const dmChan = await user.createDM(true);

                            dmChan && dmChan.send({ embeds: [ new MessageEmbed()
                                .setTitle("You have been banned")
                                .setColor(settings.embedColors.error)
                                .setDescription(`You have been banned from the server **${logMsg.guild?.name}** after being warned ${warningsAmt} times:\n\n${reasonList}`)
                            ]});

                            await user.ban({ reason: `<${this.botName ?? "bot"}> Banned after being warned ${warningsAmt} times | ${new Date().toUTCString()}` });

                            await logMsg.reply(`${votesToBan} ${votesToBan === 1 ? "person" : "people"} voted to ban, so the member was banned.`);
                        }
                        catch(err: unknown)
                        {
                            err instanceof Error && await logMsg.reply(`Couldn't ban that user${err.message ? `: ${err.message}` : " due to an error"}`);
                        }
                    }
                });
            }
        }

        try
        {
            const dmChannel = await user.createDM(true);

            const embed = new MessageEmbed()
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
