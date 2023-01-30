import { CtxMenu } from "@src/CtxMenu";
import { ApplicationCommandType } from "discord-api-types/v10";
import { ContextMenuCommandInteraction } from "discord.js";

export class Emoji extends CtxMenu {
    constructor() {
        super({
            name: "template",
            type: ApplicationCommandType.User,
        });
    }

    async run(int: ContextMenuCommandInteraction) {
        // this condition will never be true, it's just for TS to shut up
        if(!int.isMessageContextMenuCommand())
            return;

        
    }
}
