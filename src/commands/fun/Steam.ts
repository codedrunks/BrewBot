import { CommandInteraction, CommandInteractionOption, EmbedFieldData, Message, MessageEmbed } from "discord.js";
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
            category: "util",
            subcommands: [
                {
                    name: "info",
                    desc: "Shows some information about a Steam profile",
                    args: [
                        {
                            name: "username",
                            desc: "Whose info to look up - case sensitive",
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
                            required: true,
                        },
                        {
                            name: "sort",
                            desc: "How to sort the list of games",
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
            const username = int.options.getString("username", true);

            const { data, status } = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_TOKEN}&vanityurl=${username}`);

            if(status < 200 || status >= 300 || data.response.success !== 1)
                return await this.editReply(int, embedify("Couldn't find a user with that name", settings.embedColors.error));

            const usrId = data.response.steamid as string;

            const { nickname, avatar, createdAt, countryCode, realName, url } = await this.api.getUserSummary(usrId);

            switch(opt.name)
            {
            case "info":
            {
                const embed = new MessageEmbed()
                    .setTitle(`Steam user **${nickname ?? "Anonymous"}**:`)
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
                    Array.isArray(recentGames) && recentGames.length > 0 && embed.addField("Recent Games", recentGames.slice(0, 4).map(r => r.name).join(", "), true);
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

                const bm = new BtnMsg(embed, [
                    { style: "LINK", label: "Open profile", url },
                ]);

                await int.editReply({ ...bm.getReplyOpts() });
                break;
            }
            case "games":
            {
                const gamesPerPage = 20;

                const sort = int.options.getString("sort") as SortType ?? "alphabetical";

                const embeds: MessageEmbed[] = [];
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

                        const toField = (games: Game[]): EmbedFieldData => {
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

                        embeds.push(new MessageEmbed()
                            .setTitle(`${ebdTitle} of **${nickname}**${pageDisp}:`)
                            .setColor(settings.embedColors.default)
                            .setFields(fields)
                            .setFooter({ text: `${pageDisp}${pageDisp.length > 0 ? " - " : ""}total games: ${games.length} ${showingDisp}${sortedDisp}` })
                        );
                    }

                    const m = await int.fetchReply();
                    const msg = m instanceof Message ? m : undefined;

                    const pe = new PageEmbed(embeds, int.user.id, {
                        allowAllUsersTimeout: 1000 * 60,
                        goToPageBtn: msg && embeds.length > 5,
                        timeout: 1000 * 60 * 10,
                    });

                    const updatePageEbd = () => int.editReply(pe.getMsgProps());

                    msg && pe.setMsg(msg);
                    pe.setPageIdx(0);

                    pe.on("press", updatePageEbd);
                    await updatePageEbd();
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
