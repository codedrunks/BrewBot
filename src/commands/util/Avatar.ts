import { CommandInteraction, MessageEmbed } from "discord.js";
import { settings } from "../../settings";
import { Command } from "../../Command";

export class Avatar extends Command
{
    constructor()
    {
        super({
            name: "avatar",
            desc: "Shows your own or another user's avatar",
            args: [
                {
                    name: "user",
                    type: "user",
                    desc: "Which user to display the avatar of. Leave empty for your own.",
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await this.deferReply(int, false);

        const { user } = this.resolveArgs(int);

        const member = int.guild?.members.cache.find(m => user ? m.id === user : m.id === int.user.id);
        const usr = member?.user;
        
        if(usr)
        {
            const avatarUrl = usr.avatarURL({ format: "png", size: 4096 });

            if(avatarUrl)
                return await this.editReply(int, new MessageEmbed().setTitle(`Avatar of ${member?.displayName ?? usr.username}`).setColor(settings.embedColors.default).setImage(avatarUrl));
            else
                return await this.editReply(int, "That user didn't set an avatar");
        }
        else
            await this.editReply(int, "Couldn't find that user");
    }
}
