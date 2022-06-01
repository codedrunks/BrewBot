import { CommandInteraction, MessageButton } from "discord.js";
import { ButtonMessage } from "../../ButtonMessage";
import { Command } from "../../Command";

export class Btn extends Command
{
    constructor()
    {
        super({
            name: "btn",
            desc: "Template_desc",
            perms: [],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        await int.reply("yo");

        if(!int.channel)
            return;

        const buttons = [
            new MessageButton()
                .setLabel("Boio")
                .setStyle("PRIMARY")
                .setCustomId("b1"),
            new MessageButton()
                .setLabel("Uh oh, stinky")
                .setStyle("SECONDARY")
                .setCustomId("b2"),
        ];

        const btnMsg = new ButtonMessage("test", buttons);

        btnMsg.on("press", (bint) => {
            console.log("pressed btn");
        });

        btnMsg.sendIn(int.channel);
    }
}
