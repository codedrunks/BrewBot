import { CommandInteraction, CommandInteractionOption, EmbedField, EmbedBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType } from "discord.js";
import SteamAPI, { Game } from "steamapi";
import { axios, BtnMsg, embedify, PageEmbed, truncStr } from "@src/utils";
import { Command } from "@src/Command";
import { settings } from "@src/settings";

const sortChoices = [
    { name: "Alphabetically",  value: "alphabetical", display: "alphabetically" },
    { name: "Time played",     value: "time",         display: "by time played" },
    { name: "Recent activity", value: "recent",       display: "by recent activity" },
];

type SortType = "alphabetical" | "time" | "recent";

export class Steam extends Command
{
    private api: SteamAPI;

    constructor()
    {
        super({
            name: "steam",
            desc: "Info about a Steam user and their games",
            category: "fun",
            subcommands: [
                {
                    name: "info",
                    desc: "Shows some information about a Steam profile",
                    args: [
                        {
                            name: "username",
                            desc: "Whose info to look up - case sensitive",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: "games",
                    desc: "Lists all the games of a Steam user",
                    args: [
                        {
                            name: "username",
                            desc: "Whose info to look up - case sensitive",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "sort",
                            desc: "How to sort the list of games",
                            type: ApplicationCommandOptionType.String,
                            choices: sortChoices.map(({ name, value }) => ({ name, value })),
                        },
                    ],
                },
            ],
        });

        this.api = new SteamAPI(process.env.STEAM_TOKEN ?? "ERR_NO_ENV");
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption<"cached">): Promise<void>
    {
        if(!process.env.STEAM_TOKEN)
            return await this.reply(int, "This command is currently not available.", true);

        await this.deferReply(int);

        try
        {
            const username = (int.options.get("username", true).value as string).trim();

            const { data, status } = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_TOKEN}&vanityurl=${username}`);

            if(status < 200 || status >= 300 || data.response.success !== 1)
                return await this.editReply(int, embedify("Couldn't find a user with that name", settings.embedColors.error));

            const usrId = data.response.steamid as string;

            const { nickname, avatar, createdAt, countryCode, realName, url } = await this.api.getUserSummary(usrId);

            switch(opt.name)
            {
            case "info":
            {
                const embed = new EmbedBuilder()
                    .setTitle(`Steam user **${nickname ?? "Anonymous"}**:`)
                    .setColor(settings.embedColors.default);

                const embedFields: EmbedField[] = [];

                avatar && embed.setThumbnail(avatar.large ?? avatar.medium ?? avatar.small);
                realName && embedFields.push({ name: "Real name", value: realName, inline: true });
                embedFields.push({ name: "Created at", value: createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" }), inline: true });

                const promises: (() => Promise<void>)[] = [];

                promises.push(async () => {
                    countryCode && embedFields.push({ name: "Country", value: await this.getCountryName(countryCode), inline: true });
                });

                promises.push(async () => {
                    const games = await this.api.getUserOwnedGames(usrId);
                    Array.isArray(games) && games.length > 0 && embedFields.push({ name: "Games", value: String(games.length), inline: true });
                });

                promises.push(async () => {
                    const recentGames = await this.api.getUserRecentGames(usrId);
                    Array.isArray(recentGames) && recentGames.length > 0 && embedFields.push({ name: "Recent Games", value: recentGames.slice(0, 4).map(r => r.name).join(", "), inline: true });
                });

                promises.push(async () => {
                    const level = await this.api.getUserLevel(usrId);
                    const badges = await this.api.getUserBadges(usrId);

                    typeof level === "number" && embedFields.push({ name: "Level", value: `**${level}**${badges.playerXP ? ` (${badges.playerXP} / ${badges.playerXP + badges.playerNextLevelXP} XP)` : ""}`, inline: true });
                    Array.isArray(badges.badges) && badges.badges.length > 0 && embedFields.push({ name: "Badges", value: String(badges.badges.length), inline: true });
                });

                promises.push(async () => {
                    const bans = await this.api.getUserBans(usrId);
                    bans && embedFields.push({ name: "Bans", value: `VAC: ${bans.vacBans}\nGame: ${bans.gameBans}${bans.communityBanned ? "\nCommunity: banned" : ""}`, inline: true });
                });

                await Promise.allSettled(promises.map(p => p()));
                embed.addFields(embedFields);

                const bm = new BtnMsg(embed, new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open profile").setURL(url));

                await int.editReply({ ...bm.getReplyOpts() });
                break;
            }
            case "games":
            {
                const gamesPerPage = 20;

                const sort = int.options.get("sort", true).value as SortType ?? "alphabetical";

                const embeds: EmbedBuilder[] = [];
                const games = sort === "recent"
                    ? await this.api.getUserRecentGames(usrId)
                    : await this.api.getUserOwnedGames(usrId);

                if(Array.isArray(games) && games.length > 0)
                {
                    const totalPages = Math.ceil((games.length - 1) / gamesPerPage);

                    const ebdGames = this.sortGames(games, sort);

                    let pageNbr = 0;

                    while(ebdGames.length > 0)
                    {
                        pageNbr++;
                        const eRoles = ebdGames.splice(0, gamesPerPage);

                        const half = Math.ceil(eRoles.length / 2);
                        const first = eRoles.slice(0, half);
                        const second = eRoles.slice((eRoles.length - half) * -1);

                        const toField = (games: Game[]): EmbedField => {
                            const maxNameLen = 30;

                            const getVal = (withLinks = false) =>
                                games.map(g => `${withLinks ? `[${truncStr(g.name, maxNameLen, "…")}](https://store.steampowered.com/app/${g.appID})` : truncStr(g.name, maxNameLen, "…")} (${(g.playTime / 60).toFixed(1)}h)`).join("\n");

                            const val = getVal(true);

                            return {
                                name: "\u200B",
                                value: val.length < 1024 ? val : getVal(false),
                                inline: true,
                            };
                        };

                        let ebdTitle = "Steam games";

                        if(sort === "recent")
                            ebdTitle = "Recent Steam games";

                        const pageDisp = totalPages > 1 ? ` (${pageNbr}/${totalPages})` : "";
                        const sortedDisp = ` - sorted ${sortChoices.find(s => s.value === sort)!.display.toLowerCase()}`;
                        const showingDisp = games.length > gamesPerPage ? `- showing: ${gamesPerPage}` : "";

                        const fields = games.length <= (gamesPerPage / 2)
                            ? [ toField(first.concat(second)) ]
                            : [ toField(first), toField(second) ];

                        embeds.push(new EmbedBuilder()
                            .setTitle(`${ebdTitle} of **${nickname}**${pageDisp}:`)
                            .setColor(settings.embedColors.default)
                            .setFields(fields)
                            .setFooter({ text: `${pageDisp}${pageDisp.length > 0 ? " - " : ""}total games: ${games.length} ${showingDisp}${sortedDisp}` })
                        );
                    }

                    const pe = new PageEmbed(embeds, int.user.id, {
                        allowAllUsersTimeout: 1000 * 60,
                        goToPageBtn: embeds.length > 5,
                        timeout: 1000 * 60 * 10,
                    });

                    await pe.useInt(int);
                }
            }
            }
        }
        catch(err)
        {
            await this.editReply(int, embedify("Can't connect to the Steam API. Please try again later.", settings.embedColors.error));
        }
    }

    async getCountryName(code: string)
    {
        const { data, status } = await axios.get(`https://restcountries.com/v2/alpha/${code}`);

        return status >= 200 && status < 300 ? data?.name : undefined;
    }

    sortGames(games: SteamAPI.Game[], type: SortType)
    {
        let sortFn: (a: SteamAPI.Game, b: SteamAPI.Game) => boolean;

        switch(type)
        {
        case "alphabetical":
            sortFn = (a, b) => a.name.localeCompare(b.name) > -1 ? true : false;
            break;
        case "time":
            sortFn = (a, b) => a.playTime < b.playTime;
            break;
        case "recent":
            sortFn = (a, b) => a.playTime2 < b.playTime2;
            break;
        }

        return [...games].sort((a, b) => sortFn(a, b) ? 1 : -1);
    }
}
