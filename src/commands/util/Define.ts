import axios from "axios";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { Command } from "../../Command";
import { settings } from "../../settings";

type WikiArticle = {
    title: string;
    extract: string;
    pageid: number;
    url: string;
    thumbnail?: string;
};

export class Define extends Command
{
    constructor()
    {
        super({
            name: "define",
            desc: "Searches for the definition of a term",
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
                        { name: "Urban Dictionary", value: "urbandictionary" },
                    ],
                    required: true,
                },
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const { term, engine } = this.resolveArgs(int);

        if(!term || term.length < 1 || !["urbandictionary", "wikipedia"].includes(engine))
            return this.reply(int, "Please provide a term to search for and a search engine.");

        await this.deferReply(int, false);

        const embed = new MessageEmbed()
            .setColor(settings.embedColors.default);

        switch(engine)
        {
        case "urbandictionary":
        {
            const req = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
            const obj = req.data?.list[0];

            if(!obj || req.status < 200 || req.status >= 300)
                return this.editReply(int, "Couldn't reach Urban Dictionary. Please try again later.");

            const removeAnnotations = (str: string) => str.replace(/\[([\w\s\d_-]+)\]/gm, "$1");

            const { definition, example, author, thumbs_up, thumbs_down } = obj;

            const def = definition.match(/^n:\s/i) ? String(definition)[0].toUpperCase() + String(definition).substring(4) : definition;

            const ex = example.replace(/(\r?\n){1,2}/gm, "\n> ");

            embed.setTitle(`Urban Dictionary definition for **${term}**:`)
                .setDescription(`${removeAnnotations(def)}\n\n> Example:\n> ${removeAnnotations(ex)}`);

            author && thumbs_up && thumbs_down &&
                embed.setFooter({ text: `By ${author} - 👍 ${thumbs_up} 👎 ${thumbs_down} - https://www.urbandictionary.com` });

            break;
        }
        case "wikipedia":
        {
            const normalize = (str: string) => str
                .replace(/\s(\(|\))\s/gm, " ")
                .replace(/a/gm, "a");

            const searchWiki = async (searchTerm: string): Promise<void> => {
                const searchReq = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&utf8=&format=json&srsearch=${encodeURIComponent(searchTerm)}`);

                // follow suggestion if needed
                if(typeof searchReq.data?.query?.searchinfo?.suggestion === "string")
                    return await searchWiki(searchReq.data.query.searchinfo.suggestion);

                const searchResults = searchReq.data?.query?.search as WikiArticle[] | undefined;

                if(!Array.isArray(searchResults) || searchReq.status < 200 || searchReq.status >= 300)
                    return this.editReply(int, "Couldn't reach Wikipedia. Please try again later.");

                const articles: WikiArticle[] = [];

                for await(const { title: artTitle } of searchResults)
                {
                    const { data, status } = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artTitle)}`);

                    if(!data.title || status < 200 || status >= 300)
                        return this.editReply(int, "Couldn't reach Wikipedia. Please try again later.");

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
                        return this.editReply(int, "Couldn't find a wikipedia article with that term");

                    return await this.findWikiArticle(int, articles);
                }
                catch(err)
                {
                    return this.editReply(int, "Couldn't reach Wikipedia. Please try again later.");
                }
            };

            return await searchWiki(term);
        }
        }

        this.editReply(int, embed);
    }

    async findWikiArticle(int: CommandInteraction, articles: WikiArticle[])
    {
        if(!int.channel)
            throw new Error("Couldn't find channel for /define command");

        const m = await int.channel.send({ embeds: [
            new MessageEmbed()
                .setTitle("Select the best matching article")
                .setDescription(articles.map((a, i) => `${settings.emojiList[i]}  **${a.title} [\\🔗](${a.url})**`).join("\n"))
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
                    .setFooter({ text: url });

                thumbnail && ebd.setThumbnail(thumbnail);

                await this.editReply(int, ebd);
            }
        });

        coll.on("end", async (_c, reason) => {
            if(reason === "time")
            {
                await m.reactions.removeAll();
                await this.editReply(int, "No article was selected in time. Please try again.");
            }
        });

        for await(const e of emList)
            !mDeleted && await m.react(e);
    }
}
