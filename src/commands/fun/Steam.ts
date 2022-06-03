import axios from "axios";
import { CommandInteraction, MessageEmbed } from "discord.js";
import SteamAPI from "steamapi";
import { Command } from "../../Command";
import { settings } from "../../settings";

export class Steam extends Command
{
    private api: SteamAPI;

    constructor()
    {
        super({
            name: "steam",
            desc: "Shows some information about a Steam profile",
            args: [
                {
                    name: "username",
                    desc: "Whose info to look up",
                    required: true,
                }
            ]
        });

        this.api = new SteamAPI(process.env.STEAM_TOKEN ?? "ERR_NO_ENV");
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int);

        try
        {
            const { username } = this.resolveArgs(int);

            const usrId = await this.api.resolve(`https://steamcommunity.com/id/${username}`);
            const summary = await this.api.getUserSummary(usrId);

            const { nickname, avatar, createdAt, countryCode, realName, url } = summary;

            const embed = new MessageEmbed()
                .setTitle(`Steam user **${nickname}**:`)
                .setFooter({ text: url })
                .setColor(settings.embedColors.default);

            avatar && embed.setThumbnail(avatar.large ?? avatar.medium ?? avatar.small);
            realName && embed.addField("Real name", realName, true);
            embed.addField("Created at", createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" }), true);

            const promises: (() => Promise<void>)[] = [];

            promises.push(async () => {
                countryCode && embed.addField("Country", await this.getCountryName(countryCode), true);
            });

            promises.push(async () => {
                const games = await this.api.getUserOwnedGames(usrId);
                Array.isArray(games) && games.length > 0 && embed.addField("Games", String(games.length), true);
            });

            promises.push(async () => {
                const recentGames = await this.api.getUserRecentGames(usrId);
                Array.isArray(recentGames) && recentGames.length > 0 && embed.addField("Recent Games", recentGames.map(r => r.name).join(", "), true);
            });

            promises.push(async () => {
                const level = await this.api.getUserLevel(usrId);
                const badges = await this.api.getUserBadges(usrId);

                typeof level === "number" && embed.addField("Level", `**${level}**${badges.playerXP ? ` (${badges.playerXP} / ${badges.playerXP + badges.playerNextLevelXP} XP)` : ""}`, true);
                Array.isArray(badges.badges) && badges.badges.length > 0 && embed.addField("Badges", String(badges.badges.length), true);
            });

            promises.push(async () => {
                const bans = await this.api.getUserBans(usrId);
                bans && embed.addField("Bans", `VAC: ${bans.vacBans}\nGame: ${bans.gameBans}${bans.communityBanned ? "\nCommunity: banned" : ""}`, true);
            });

            await Promise.allSettled(promises.map(p => p()));

            await this.editReply(int, embed);
        }
        catch(err)
        {
            await this.editReply(int, "Couldn't connect to the Steam API. Please try again later.");
        }
    }

    async getCountryName(code: string)
    {
        const { data } = await axios.get(`https://restcountries.com/v2/alpha/${code}`);

        return data?.name ?? undefined;
    }
}
