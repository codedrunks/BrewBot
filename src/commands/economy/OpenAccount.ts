import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { createNewUser } from "../../database";

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

        await createNewUser(userid);

        return this.reply(int, `Created or updated an account for ${int.user.username}.`);
    }
}