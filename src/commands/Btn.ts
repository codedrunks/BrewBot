import { CommandInteraction, MessageButton, MessageEmbed } from "discord.js";
import { BtnMsg } from "../BtnMsg";
import { Command } from "../Command";

export class Btn extends Command
{
    constructor()
    {
        super({
            name: "btn",
            desc: "DEBUG",
            perms: [ "MANAGE_MESSAGES" ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const bm = new BtnMsg(
            new MessageEmbed()
                .setTitle("cocke")
                .setDescription("e"),
            [
                new MessageButton().setLabel("Secondary1").setStyle("SECONDARY"),
                new MessageButton().setLabel("Secondary2").setStyle("SECONDARY"),
                new MessageButton().setLabel("Secondary3").setStyle("SECONDARY"),
            ]
        );

        bm.on("press", (btn, int) => {
            int.reply({ content: `${int.user.username} pressed ${btn.label}`, ephemeral: false });

            console.log();
        });

        await int.reply({ ...bm.getMsgOpts(), ephemeral: false });
    }
}
