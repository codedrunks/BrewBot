import { CommandInteraction, MessageEmbed } from "discord.js";
import { settings } from "@src/settings";
import { Command } from "@src/Command";
import { AxiosError } from "axios";
import { axios, embedify } from "@src/utils";

export class Avatar extends Command
{
    constructor()
    {
        super({
            name: "avatar",
            desc: "Shows your own or another user's avatar",
            category: "util",
            args: [
                {
                    name: "user",
                    type: "user",
                    desc: "Which user to display the avatar of. Leave empty for your own.",
                },
                {
                    name: "format",
                    desc: "Format of the image",
                    choices: [
                        { name: "png", value: "png" },
                        { name: "gif", value: "gif" },
                    ],
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int);

        const usr = int.options.getUser("user");
        const fmt = int.options.getUser("format");

        const format = (fmt ?? undefined) as ("png" | "gif" | undefined);

        if(usr)
        {
            const requestedAvUrl = usr.avatarURL({ format, size: 4096 });

            let status = 400;

            try
            {
                if(requestedAvUrl)
                    status = (await axios.get(requestedAvUrl)).status;
            }
            catch(err)
            {
                status = err instanceof AxiosError ? parseInt(err.status ?? "415") : 415;
            }

            const avatarUrl = (status >= 400 ? usr.avatarURL({ format: "png", size: 4096 }) : requestedAvUrl);

            if(avatarUrl)
            {
                const ebd = new MessageEmbed()
                    .setTitle(`Avatar of <@${usr.id}>:`)
                    .setColor(settings.embedColors.default)
                    .setImage(avatarUrl);
                format && ebd.setFooter({ text: `[${format.toUpperCase()}]` });

                return await this.editReply(int, ebd);
            }
            else
                return await this.editReply(int, embedify("This user doesn't have an avatar", settings.embedColors.default));
        }
        else
            await this.editReply(int, embedify("Couldn't find this user", settings.embedColors.error));
    }
}
