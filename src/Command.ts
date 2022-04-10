import { Client, Message } from "discord.js";

export abstract class Command {
    constructor(meta: CommandMeta)
    {

    }

    abstract run(client: Client, msg: Message): void;
}

export interface CommandMeta {
    /** Main command and its aliases */
    aliases: string[];
    /** Everything regarding the /help command */
    help: {
        /** Help text description */
        desc: string;
    };
    /** Required permission level to run this command */
    perm?: "user" | "mod";
}
