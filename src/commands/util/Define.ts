import { CommandInteraction, MessageButton, MessageEmbed } from "discord.js";
import axios from "axios";
import { embedify, useEmbedify } from "@src/util";
import { Command } from "@src/Command";
import { settings } from "@src/settings";

type WikiArticle = {
    title: string;
    extract: string;
    pageid: number;
    url: string;
    thumbnail?: string;
};

type DictEntry = {
    word: string;
    phonetic?: string;
    partOfSpeech?: string;
    definitions?: string[];
    pronounciation: string;
    source: string;
};

// TODO: change to raw.githubuserimages url after making the repo public
const icons = {
    dictionary: "https://i.postimg.cc/QF6f8Vry/dictionary.png",
    wikipedia: "https://i.postimg.cc/KKRJRFGv/wikipedia.png",
    urbandictionary: "https://i.postimg.cc/R3yGt8h1/urbandictionary.png",
};

export class Define extends Command
{
    constructor()
    {
        super({
            name: "define",
            desc: "Searches for the definition of a term",
            category: "util",
            args: [
                {
                    name: "term",
                    desc: "The term to search for",
                    required: true,
                },
                {
                    name: "engine",
                    desc: "Which search engine to use for the term's definition",
                    choices: [
                        { name: "Wikipedia", value: "wikipedia" },
                        { name: "Dictionary", value: "dictionary" },
                        { name: "Urban Dictionary", value: "urbandictionary" },
                    ],
                    required: true,
                },
            ],
        });
    }

    // @TryCatchMethod((err, int) => int?.reply({ embeds: [ embedify("Something went wrong!") ], ephemeral: true }))
    async run(int: CommandInteraction): Promise<void>
    {
        const term = int.options.getString("term", true);
        const engine = int.options.getString("engine", true);

        await this.deferReply(int);

        const embed = new MessageEmbed()
            .setColor(settings.embedColors.default);

        const btns: MessageButton[] = [];

        switch(engine)
        {
        //#SECTION urbandict
        case "urbandictionary":
        {
            const req = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);

            // TODO: use better sorting algo
            const results = req.data?.list?.sort(
                (a: Record<string, number>, b: Record<string, number>) => (a.thumbs_up - a.thumbs_down) < (b.thumbs_up - b.thumbs_down) ? 1 : -1
            );

            if(req.status < 200 || req.status >= 300)
                return await this.editReply(int, embedify("Couldn't reach Urban Dictionary. Please try again later.", settings.embedColors.error));
            if(!Array.isArray(results) || results.length === 0)
                return await this.editReply(int, embedify("Couldn't find that term.", settings.embedColors.error));

            const obj = results?.at(0);

            const normalize = (str: string) => str.replace(/\[([\w\s\d_\-.'`´’*+#]+)\]/gm, "$1");

            const { definition, example, author, thumbs_up, thumbs_down, permalink } = obj;

            const def = definition.match(/^n:\s/i) ? String(definition)[0].toUpperCase() + String(definition).substring(4) : definition;

            const ex = example.replace(/(\r?\n){1,2}/gm, "\n> ");

            embed.setTitle(`Urban Dictionary definition for **${term}**:`)
                .setDescription(`Definition:\n${normalize(def)}\n${ex && ex.length > 0 ? `\n> Example:\n> ${normalize(ex)}\n` : ""}`);

            author && thumbs_up && thumbs_down &&
                embed.setFooter({
                    text: `By ${trimLength(author, 32)} - 👍 ${thumbs_up} 👎 ${thumbs_down}`,
                    iconURL: icons.urbandictionary,
                });

            const redirLink = await grabRedirectUrl(permalink);

            btns.push(new MessageButton()
                .setStyle("LINK")
                .setLabel("Open")
                .setURL(redirLink ?? permalink)
            );

            break;
        }
        //#SECTION wikipedia
        case "wikipedia":
        {
            const normalize = (str: string) => str
                .replace(/\s(\(|\))\s/gm, " ")
                .replace(/a/gm, "a");

            const searchWiki = async (searchTerm: string): Promise<void> => {
                const searchReq = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&utf8=&format=json&srsearch=${encodeURIComponent(searchTerm)}`);

                // follow suggestion if needed
                if((!Array.isArray(searchReq.data?.query?.search) || searchReq.data.query.search.length === 0) && typeof searchReq.data?.query?.searchinfo?.suggestion === "string")
                    return await searchWiki(searchReq.data.query.searchinfo.suggestion);

                const searchResults = searchReq.data?.query?.search as WikiArticle[] | undefined;

                const errored = (reason: "offline" | "notfound") => this.editReply(int, embedify(
                    reason === "offline"
                        ? "Couldn't reach Wikipedia. Please try again later."
                        : "Couldn't find that term.",
                    settings.embedColors.error));

                if(searchReq.status < 200 || searchReq.status >= 300)
                    return await errored("offline");
                else if(!Array.isArray(searchResults))
                    return await errored("notfound");


                const articles: WikiArticle[] = [];

                for await(const { title: artTitle } of searchResults)
                {
                    const { data, status } = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artTitle)}`);

                    if(status < 200 || status >= 300)
                        return await errored("offline");
                    else if(!data.title)
                        return await errored("notfound");

                    data.type === "standard" && articles.push({
                        title: data.title,
                        extract: normalize(data.extract),
                        pageid: data.pageid,
                        url: data.content_urls.desktop.page,
                        thumbnail: data?.originalimage?.source ?? data?.thumbnail?.source,
                    });

                    if(articles.length === 5)
                        break;
                }

                try
                {
                    if(articles.length === 0)
                        return await this.editReply(int, "Couldn't find a wikipedia article with that term");

                    await this.findWikiArticle(int, articles);
                    return;
                }
                catch(err)
                {
                    return await this.editReply(int, "Couldn't reach Wikipedia. Please try again later.");
                }
            };

            return await searchWiki(term);
        }
        //#SECTION dictionary
        case "dictionary":
        {
            const termNotFound = () => this.editReply(int, embedify("Couldn't find that term.", settings.embedColors.error));
            let res;

            try
            {
                res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${term}`);
            }
            catch(err)
            {
                return await termNotFound();
            }

            const { data, status } = res;

            if(status === 404 || !Array.isArray(data) || data.length === 0)
                return await termNotFound();

            if(status < 200 || status >= 300)
                return await this.editReply(int, embedify("Couldn't reach the dictionary API. Please try again later.", settings.embedColors.error));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parseEntry = (data: any): DictEntry => {
                const meanings = Array.isArray(data.meanings) && data.meanings.length > 0 ?
                    data.meanings.sort((a: Record<string, string>, b: Record<string, string>) => (a.length > b.length ? 1 : -1))
                    : undefined;

                return {
                    word: data.word,
                    phonetic: data.phonetic,
                    partOfSpeech: meanings ? meanings[0]?.partOfSpeech : undefined,
                    definitions: meanings ? meanings[0].definitions.map((d: Record<string, string>) => d.definition).slice(0, 8) : undefined,
                    pronounciation: Array.isArray(data.phonetics) && data.phonetics.length > 0 ? data.phonetics[0]?.audio : undefined,
                    source: Array.isArray(data.sourceUrls) ? data.sourceUrls[0] : data.sourceUrls,
                };
            };

            const entry = parseEntry(data[0]);

            const desc = [
                `**${entry.word}** ${entry.partOfSpeech ? `(${entry.partOfSpeech}) ` : ""}${entry.phonetic ? `\`${entry.phonetic}\`` : ""}\n`,
                `Definition${entry.definitions?.length === 1 ? "" : "s"}:`,
                entry.definitions ? `- ${entry.definitions.join("\n- ")}` : "(no definitions found)",
            ].join("\n");

            embed.setTitle(`Dictionary entry for **${term}**:`)
                .setDescription(desc)
                .setFooter({ text: "dictionaryapi.dev", iconURL: icons.dictionary });

            if(entry.pronounciation)
                btns.push(new MessageButton().setStyle("LINK").setLabel("Pronounciation").setURL(entry.pronounciation));

            btns.push(new MessageButton().setStyle("LINK").setLabel("Source").setURL(entry.source));

            break;
        }
        }

        // await this.editReply(int, embed);
        await int.editReply({
            embeds: [ embed ],
            ...Command.useButtons(btns),
        });
    }

    /** Returns an embed description for an emoji-choice-dialog */
    emojiChoiceDesc(choices: { name: string, url?: string }[]): string
    {
        return choices.map((a, i) => `${settings.emojiList[i]}  **${a.name}**${a.url ? ` - [open <:open_in_browser:994648843331309589>](${a.url})` : ""}`).join("\n");
    }

    async findWikiArticle(int: CommandInteraction, articles: WikiArticle[])
    {
        if(!int.channel)
            return await int.reply(useEmbedify("Please run this command in a server's text channel.", settings.embedColors.error));

        const m = await int.channel.send({ embeds: [
            new MessageEmbed()
                .setTitle("Select the best matching article")
                .setDescription(this.emojiChoiceDesc(
                    articles.map(
                        ({ title: name, url }) => ({ name, url })
                    )
                ))
                .setColor(settings.embedColors.default)
        ]});

        const emList = settings.emojiList.slice(0, Math.min(articles.length, settings.emojiList.length));

        const coll = m.createReactionCollector({
            filter: (re, usr) => {
                return !usr.bot
                    && emList.includes(re.emoji.name ?? "_")
                    && (re.message.createdTimestamp && Date.now() - re.message.createdTimestamp < 20000 ? usr.id === int.user.id : true) ? true : false;
            },
            time: 2 * 60 * 1000,
            dispose: true,
            max: 1,
        });

        let mDeleted = false;

        coll.on("collect", async (re) => {
            const artIdx = settings.emojiList.indexOf(re.emoji.name ?? "_");

            if(artIdx >= 0)
            {
                mDeleted = true;
                await m.delete();

                const { title, extract, url, thumbnail } = articles[artIdx];

                const ebd = new MessageEmbed()
                    .setTitle(`Wikipedia definition for **${title}**:`)
                    .setColor(settings.embedColors.default)
                    .setDescription(extract)
                    .setFooter({ text: "wikipedia.org", iconURL: icons.wikipedia });

                thumbnail && ebd.setThumbnail(thumbnail);

                return await int.editReply({
                    embeds: [ ebd ],
                    ...Command.useButtons(new MessageButton()
                        .setStyle("LINK")
                        .setLabel("Open")
                        .setURL(url)
                    )
                });
            }
        });

        coll.on("end", async (_c, reason) => {
            if(reason === "time")
            {
                await m.reactions.removeAll();
                return await this.editReply(int, "No article was selected in time. Please try again.");
            }
        });

        for await(const e of emList)
            !mDeleted && await m.react(e);
    }
}

/** Follows redirects of a `url` and returns the final URL */
async function grabRedirectUrl(url: string): Promise<string | null>
{
    try
    {
        const { request } = await axios.get(url);

        return request?.res?.responseUrl ?? null;
    }
    catch(err)
    {
        return null;
    }
}

/** Trims a `str`ing if it's longer than `len` (32 by default) and adds `trimChar` (`…` by default) */
function trimLength(str: string, len = 32, trimChar = "…")
{
    return str.length > len ? str.substring(0, len) + trimChar : str;
}
