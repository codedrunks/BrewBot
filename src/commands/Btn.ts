import { CommandInteraction, MessageButton, MessageEmbed } from "discord.js";
import { BtnMsg } from "@src/BtnMsg";
import { Command } from "@src/Command";

export class Btn extends Command
{
    constructor()
    {
        super({
            name: "btn",
            desc: "DEBUG",
            category: "restricted",
            perms: [ "MANAGE_MESSAGES" ],
            args: [
                {
                    name: "private",
                    desc: "True = only you can use the buttons",
                    type: "boolean",
                },
            ],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        const args = this.resolveArgs<boolean>(int);

        const priv = args["private"];

        const bm = new BtnMsg(
            new MessageEmbed()
                .setTitle("minimum wage bussy")
                .setDescription("is it me or does minimum wage bussy hit different? the stress of having student loans makes them so tight. i'm bored of my whole foods, globe trotting boyfriend. all that easy living has him way too relaxed if you know what i mean? i'll drive an hour just to see the bossy starbucks barista power bottom just so I can hit it in his honda civic. they're the best mistresses, simple creatures. they're happy with just going to chili's and coldstone too. unlike my current LeLabo scented bottom with his stress-free, lasered bootyhole asking me to take him to michelin star restaurants so i can MAYBE get romantic, vanilla butt sex and then gets mad at me for getting the squirties on our egyptian cotton Frette sheets man who cares? i'm just trying to fuhq"),
            [
                new MessageButton().setLabel("Primary").setStyle("PRIMARY"),
                new MessageButton().setLabel("Secondary").setStyle("SECONDARY"),
                new MessageButton().setLabel("Success").setStyle("SUCCESS"),
                new MessageButton().setLabel("Destroy").setStyle("DANGER"),
            ],
            {
                timeout: 1000 * 60,
            }
        );

        bm.on("press", async (btn, btnInt) => {
            if(priv && btnInt.user.id !== int.user.id)
                return await btnInt.reply({ content: "You can't interact with this. Please run the command yourself.", ephemeral: true });

            await btnInt.reply({ content: `${btnInt.user.username} pressed ${btn.label}`, ephemeral: false });

            btn.label === "Destroy" && bm.destroy();
        });

        bm.on("destroy", async () => {
            await int.editReply({ ...bm.getMsgOpts(), components: [] });
        });

        await int.reply({ ...bm.getReplyOpts(), ephemeral: false });
    }
}
