import { CommandInteraction, MessageEmbed } from "discord.js";
import { Command } from "../../Command";
import { deleteUser } from "../../database";
import { settings } from "../../settings";
import { embedify } from "../../util";

let devs = settings.devs;

export class CloseAccount extends Command {
    constructor() {
        super({
            name: "closeaccount",
            desc: "Delete your database entry",
        })
    }

    async run(int: CommandInteraction): Promise<void> {
        let userid = int.user.id;
        
        if(!devs.includes(userid)) return this.reply(int, embedify("You do not have permission to do this."));

        await deleteUser(userid);

        return this.reply(int, "Done");
    }
}