import { CommandInteraction, MessageEmbed } from "discord.js";
import { Command } from "@src/Command";
import { PageEmbed } from "@src/utils";

export class Test extends Command
{
    constructor()
    {
        super({
            name: "test",
            desc: "PageEmbed test bich",
            category: "restricted",
            perms: [],
        });
    }

    async run(int: CommandInteraction): Promise<void>
    {
        if(!int.channel)
            return;

        const pages = [
            new MessageEmbed()
                .setTitle("PAGE 1")
                .setDescription("cock soufflé"),
            new MessageEmbed()
                .setTitle("PAGE 2")
                .setDescription("bungus burger"),
            new MessageEmbed()
                .setTitle("PAGE 3")
                .setDescription("tiddy juice"),
        ];
        const pe = new PageEmbed(pages, { timeout: 60 * 1000 });

        pe.on("press", (int, type) => {
            int.reply(`${int.user.username} pressed PageEmbed button "${type}"`);
        });

        pe.on("error", (err) => console.error(err));

        pe.on("destroy", (btnIds) => console.log(`PageEmbed destroyed with btnIds:\n${btnIds.join(", ")}`));

        await pe.sendIn(int.channel);
    }
}
