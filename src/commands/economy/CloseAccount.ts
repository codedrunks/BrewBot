import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { deleteUser } from "../../database/users";
import { settings } from "../../settings";
import { embedify } from "../../util";

const devs = settings.devs;

export class CloseAccount extends Command {
    constructor() {
        super({
            name: "closeaccount",
            desc: "Delete your database entry",
            category: "economy"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const userid = int.user.id;
        
        if(!devs.includes(userid)) return this.reply(int, embedify("You do not have permission to do this."), true);

        await deleteUser(userid);

        return this.reply(int, "Done");
    }
}
