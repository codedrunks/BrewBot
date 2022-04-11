import { Client, Message } from "discord.js";
import { unused } from "svcorelib";

/** Base class for all bot commands */
export abstract class Command {
	/** Base class for all bot commands */
	constructor(meta: CommandMeta)
	{
		unused(meta);
	}

    /** This method is called whenever this commands is run by a user */
    abstract run(client: Client, msg: Message): Promise<unknown>;
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
