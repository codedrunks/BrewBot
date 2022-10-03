import { CommandInteraction, EmbedBuilder } from "discord.js";
import { randomItem } from "svcorelib";
import { AxiosError } from "axios";
import { axios } from "@src/utils";
import { Command } from "@src/Command";
import { settings } from "@src/settings";

const apiInfo = {
    illusion: {
        name: "KotAPI",
        url: "https://api.illusionman1212.com/kotapi",
        embedFooter: "https://github.com/IllusionMan1212/kotAPI"
    },
};

const embedTitles = [
    "cat.",
    "Good cat",
    "Aww, look at it",
    "What a cutie",
    "<:qt_cett:610817939276562433>",
];

export class Cat extends Command
{
    constructor()
    {
        super({
            name: "cat",
            desc: "Shows you images of cats",
            category: "fun"
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        try
        {
            await this.deferReply(int);

            let api = "" as "illusion";

            let allowRetry = false;

            if(!api || api.length === 0)
            {
                allowRetry = true;
                api = randomItem(Object.keys(apiInfo)) as typeof api;
            }

            const triedApis: typeof api[] = [];

            const tryApi = async (tApi: typeof api): Promise<void> => {
                triedApis.push(tApi);

                try
                {
                    const { data } = await axios.get(apiInfo[tApi].url, { timeout: 5000 });

                    if(data.webpurl || data.compressed_url)
                    {
                        const embed = new EmbedBuilder()
                            .setTitle(randomItem(embedTitles))
                            .setColor(settings.embedColors.default)
                            .setFooter({ text: apiInfo[tApi].embedFooter })
                            .setImage(data.webpurl ?? data.compressed_url);

                        return await this.editReply(int, embed);
                    }
                    else
                        return await this.editReply(int, `Couldn't fetch an image from ${apiInfo[api].name}. Please try again later.`);
                }
                catch(err)
                {
                    if(!(err instanceof AxiosError) || !err.response)
                        return await this.editReply(int, `${apiInfo[tApi].name} is currently unreachable. Please try again later.`);

                    const { status } = err.response;

                    if(status < 200 || status >= 300)
                    {
                        const avlApis = Object.keys(apiInfo).filter(a => !triedApis.includes(a as typeof api)) as typeof api[];

                        if(avlApis.length === 0)
                            return await this.editReply(int, "All cat APIs are currently unreachable. Please try again later.");

                        const newApi = randomItem(avlApis);

                        if(allowRetry)
                            return await tryApi(newApi);
                        else
                            return await this.editReply(int, `${apiInfo[tApi].name} is currently unreachable. Please try again later.`);
                    }
                }
            };

            return await tryApi(api);
        }
        catch(err)
        {
            const msg = `Encountered an internal error${err instanceof Error ? `: ${err.message}` : ""}`;

            if(int.deferred)
                return await this.editReply(int, msg);

            return await this.reply(int, msg, true);
        }
    }
}
