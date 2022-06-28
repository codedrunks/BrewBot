import { CommandInteraction } from "discord.js";
import { Command } from "@src/Command";
import { createNewUser } from "@database/users";
import { embedify } from "@src/util";

export class OpenAccount extends Command {
    constructor() {
        super({
            name: "openaccount",
            desc: "Opens a coin account with Bot Bank :tm:",
            category: "economy",
            perms: []
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const userid = int.user.id;

        if(!int.guild?.id) return this.reply(int, embedify("This command cannot be used in DM's"));

        const guildid = int.guild.id;

        await createNewUser(userid, guildid);

        return this.reply(int, embedify(`Created or updated an account for ${int.user.username}.`), true);
    }
}
