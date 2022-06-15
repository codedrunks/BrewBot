import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { createNewUser } from "../../database";
import { embedify } from "../../util";

export class OpenAccount extends Command {
    constructor() {
        super({
            name: "openaccount",
            desc: "Opens a coin account with Bot Bank :tm:",
            perms: []
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        let userid = int.user.id;

        if(!int.guild?.id) return this.reply(int, embedify(`This command cannot be used in DM's`));

        let guildid = int.guild.id;

        await createNewUser(userid, guildid);

        return this.reply(int, embedify(`Created or updated an account for ${int.user.username}.`), true);
    }
}