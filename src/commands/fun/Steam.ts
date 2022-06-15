import axios from "axios";
import { CommandInteraction, CommandInteractionOption, EmbedFieldData, MessageButton, MessageEmbed } from "discord.js";
import SteamAPI, { Game } from "steamapi";
import { BtnMsg } from "../../BtnMsg";
import { Command } from "../../Command";
import { settings } from "../../settings";

export class Steam extends Command
{
    private api: SteamAPI;

    constructor()
    {
        super({
            name: "steam",
            desc: "Steam-related commands",
            subcommands: [
                {
                    name: "info",
                    desc: "Shows some information about a Steam profile",
                    args: [
                        {
                            name: "username",
                            desc: "Whose info to look up - case sensitive",
                            required: true,
                        }
                    ],
                },
                {
                    name: "gamelist",
                    desc: "Lists all the games of a Steam user",
                    args: [
                        {
                            name: "username",
                            desc: "Whose info to look up - case sensitive",
                            required: true,
                        }
                    ],
                }
            ]
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
            const { username } = this.resolveArgs(int);

            const { data } = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_TOKEN}&vanityurl=${username}`);

            const usrId = data.response.steamid as string;

            if(data.response.success !== 1)
                return await this.editReply(int, "Couldn't find a user with that name");

            const { nickname, avatar, createdAt, countryCode, realName, url } = await this.api.getUserSummary(usrId);

            switch(opt.name)
            {
            case "info":
            {
                const embed = new MessageEmbed()
                    .setTitle(`Steam user **${nickname ?? "Anonymous"}**:`)
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
                break;
            }
            case "gamelist":
            {
                const gamesPerMsg = 40;

                const embeds: MessageEmbed[] = [];
                const games = await this.api.getUserOwnedGames(usrId);

                if(Array.isArray(games) && games.length > 0)
                {
                    const totalPages = Math.ceil((games.length - 1) / gamesPerMsg);

                    const ebdGames = games;
                    let pageNbr = 0;

                    while(ebdGames.length > 0)
                    {
                        pageNbr++;
                        const eRoles = ebdGames.splice(0, gamesPerMsg);

                        const half = Math.ceil(eRoles.length / 2);
                        const first = eRoles.slice(0, half);
                        const second = eRoles.slice((eRoles.length - half) * -1);

                        const toField = (games: Game[]): EmbedFieldData => ({ name: "", value: games.map(g => g.name).join("\n") });

                        const pageDisp = totalPages > 1 ? ` (${pageNbr}/${totalPages})` : "";

                        embeds.push(new MessageEmbed()
                            .setTitle(`Showing Steam games of **${nickname}**:${pageDisp}`)
                            .setColor(settings.embedColors.default)
                            .setFields([ toField(first), toField(second) ])
                        );
                    }

                    const btns: MessageButton[] = [
                        new MessageButton().setEmoji("⏮️").setLabel("First").setStyle("SECONDARY"),
                        new MessageButton().setEmoji("⬅️").setLabel("Previous").setStyle("PRIMARY"),
                        new MessageButton().setEmoji("➡️").setLabel("Next").setStyle("PRIMARY"),
                        new MessageButton().setEmoji("⏭️").setLabel("Last").setStyle("SECONDARY"),
                    ];

                    const bm = new BtnMsg(embeds[0], btns, { timeout: 1000 * 60 * 5 });

                    let ebdIdx = 0;

                    bm.on("press", async (btn, int) => {
                        switch(btn.label)
                        {
                        case "First":
                            ebdIdx = 0;
                            break;
                        case "Previous":
                            ebdIdx--;
                            if(ebdIdx < 0)
                                ebdIdx = embeds.length - 1;
                            break;
                        case "Next":
                            ebdIdx++;
                            if(ebdIdx >= embeds.length)
                                ebdIdx = 0;
                            break;
                        case "Last":
                            ebdIdx = embeds.length - 1;
                            break;
                        }

                        await int.editReply({ ...bm.getReplyOpts(), embeds: [ embeds[ebdIdx] ] });
                    });

                    await int.editReply({ ...bm.getReplyOpts(), embeds: [ embeds[0] ] });
                }
            }
            }
        }
        catch(err)
        {
            await this.editReply(int, "Can't connect to the Steam API. Please try again later.");
        }
    }

    async getCountryName(code: string)
    {
        const { data } = await axios.get(`https://restcountries.com/v2/alpha/${code}`);

        return data?.name ?? undefined;
    }
}
