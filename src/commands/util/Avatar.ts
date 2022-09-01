import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { settings } from "@src/settings";
import { Command } from "@src/Command";
import axios, { AxiosError } from "axios";

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
                    type: ApplicationCommandOptionType.User,
                    desc: "Which user to display the avatar of. Leave empty for your own.",
                },
                {
                    name: "format",
                    desc: "Format of the image",
                    type: ApplicationCommandOptionType.String,
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

        const user = int.options.getUser("user");
        const fmt = int.options.get("format")?.value as string | undefined;

        const member = int.guild?.members.cache.find(m => user ? m.id === user.id : m.id === int.user.id);
        const usr = member?.user;

        const format = fmt as ("png" | "gif" | undefined) ?? "png";

        if(usr)
        {
            const requestedAvUrl = usr.avatarURL({ extension: format, size: 4096 });

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

            const avatarUrl = (status >= 400 ? usr.avatarURL({ extension: "png", size: 4096 }) : requestedAvUrl);

            if(avatarUrl)
                return await this.editReply(int, new EmbedBuilder()
                    .setTitle(`Avatar of **${member?.displayName ?? usr.username}**:`)
                    .setColor(settings.embedColors.default)
                    .setImage(avatarUrl)
                    .setFooter({ text: `[${format.toUpperCase()}]` })
                );
            else
                return await this.editReply(int, "That user has no avatar");
        }
        else
            await this.editReply(int, "Couldn't find that user");
    }
}
