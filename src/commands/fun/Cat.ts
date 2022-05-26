import { CommandInteraction, MessageEmbed } from "discord.js";
import { randomItem } from "svcorelib";
import axios from "axios";
import { Command } from "../../Command";
import { settings } from "../../settings";

const apiInfo = {
    illusion: {
        name: "KotAPI",
        url: "https://api.illusionman1212.tech/kotapi",
        embedFooter: "https://github.com/IllusionMan1212/kotAPI"
    },
    thatcopy: {
        name: "catAPI",
        url: "https://thatcopy.pw/catapi/rest/",
        embedFooter: "https://thatcopy.pw/catapi"
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
            perms: [],
            args: [
                {
                    name: "api",
                    desc: "Selects which API the images should come from",
                    choices: [
                        { name: "illusion", value: "illusion" },
                        { name: "thatcopy", value: "thatcopy" },
                    ]
                },
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int);

        const args = this.resolveArgs(int);
        let api = args.api as "illusion" | "thatcopy";

        if(!api || api.length === 0)
            api = randomItem(Object.keys(apiInfo)) as "illusion" | "thatcopy";

        const { data, status, statusText } = await axios.get(apiInfo[api].url, { timeout: 10000 });

        if(status < 200 || status >= 300)
        {
            await this.editReply(int, `${apiInfo[api]} is currently unreachable. Please try again later.\nStatus: ${status} - ${statusText}`);
            return;
        }

        if(data.webpurl || data.compressed_url)
        {
            const embed = new MessageEmbed()
                .setTitle(randomItem(embedTitles))
                .setColor(settings.embedColors.default)
                .setFooter({ text: apiInfo[api].embedFooter })
                .setImage(data.webpurl ?? data.compressed_url);

            await this.editReply(int, embed);
            return;
        }
        else
            await this.editReply(int, `Couldn't fetch an image from ${apiInfo[api].name}. Please try again later.`);
    }
}
