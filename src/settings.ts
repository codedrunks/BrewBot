import { ColorResolvable, IntentsString } from "discord.js";
import dotenv from "dotenv";
import { Stringifiable } from "svcorelib";

dotenv.config();


export const settings: Settings = {
    debug: {
        /** Whether to send a bell sound in the console when the bot is ready */
        bellOnReady: envVarEquals("BELL_ON_READY", true),
    },
    moderation: {
        /** How many reaction votes are needed to ban someone */
        votesToBan: 2,
    },
    client: {
        /**
         * List of intents the client requests from the gateway.  
         * Intents are like events the client needs to explicitly subscribe to or it will not receive the events from the API.  
         * As long as the bot is in < 100 guilds, it will get granted any intent. After 100 guilds, it needs to be verified by Discord to get the intents granted.
         */
        intents: [
            "GUILDS",
            "GUILD_MEMBERS",
            "GUILD_INTEGRATIONS",
            "GUILD_PRESENCES",
            "GUILD_MESSAGES",
            "GUILD_MESSAGE_REACTIONS",
            "DIRECT_MESSAGES",
        ],
    },
    embedColors: {
        default: "FUCHSIA",
        warning: "ORANGE",
        error: "DARK_RED",
    },
    /** When reached, sends a message to the moderators */
    warningsThreshold: 3,
};

/** Tests if the environment variable `varName` equals `value` */
function envVarEquals(varName: string, value: string | Stringifiable)
{
    return process.env[varName]?.toLowerCase() === value.toString().toLowerCase();
}


interface Settings {
    debug: {
        bellOnReady: boolean;
    }
    moderation: {
        votesToBan: number;
    }
    client: {
        intents: IntentsString[];
    }
    embedColors: {
        default: ColorResolvable;
        warning: ColorResolvable;
        error: ColorResolvable;
    }
    warningsThreshold: number;
}
