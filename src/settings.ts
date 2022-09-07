import { GatewayIntentBits } from "discord-api-types/v10";
import { ColorResolvable, Colors } from "discord.js";
import dotenv from "dotenv";
import { Stringifiable } from "svcorelib";

const Intents = GatewayIntentBits;

dotenv.config();

/**
 * Global miscellaneous settings for the bot
 * @readonly
 */
export const settings: Settings = Object.freeze({
    debug: {
        /** Whether to send a bell sound in the console when the bot is ready */
        bellOnReady: envVarEquals("BELL_ON_READY", true),
    },
    moderation: {
        /** How many reaction votes are needed to ban someone */
        votesToBan: 2,
        /** How many warnings are needed until a notice is sent in the bot-logs channel */
        warningsUntilNotice: 3,
    },
    client: {
        /**
         * List of intents the client requests from the gateway.  
         * Intents are like events the client needs to explicitly subscribe to or it will not receive the events from the API.  
         * As long as the bot is in < 100 guilds, it will get granted any intent.  
         * After 100 guilds, it needs to be verified by Discord to get some of the intents granted.
         */
        intents: [
            Intents.Guilds,
            Intents.GuildMembers,
            Intents.GuildIntegrations,
            Intents.GuildInvites,
            Intents.GuildVoiceStates,
            Intents.GuildPresences,
            Intents.GuildMessages,
            Intents.GuildMessageReactions,
            Intents.DirectMessages,
        ],
    },
    embedColors: {
        default: "#faba05",
        success: Colors.Green,
        gameLost: Colors.Grey,
        warning: Colors.Orange,
        error: Colors.DarkRed,
        contestWinner: Colors.Gold,
    },
    /** Incremental list of emojis used in reactions */
    emojiList: [ "🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹" ],
    devs: getEnvVar("DEV_IDS", "stringArray"),
    commands: {
        execEnabled: !envVarEquals("EXEC_CMD_ENABLED", false),
    },
}) as Settings;

/** Tests if the environment variable `varName` equals `value` casted to string - value is case insensitive */
function envVarEquals(varName: string, value: Stringifiable)
{
    return process.env[varName]?.toLowerCase() === value.toString().toLowerCase();
}

/** Grabs an environment variable's value, and casts it to a `string` */
export function getEnvVar(varName: string, asType?: "string"): undefined | string
/** Grabs an environment variable's value, and casts it to a `number` */
export function getEnvVar(varName: string, asType: "number"): undefined | number
/** Grabs an environment variable's value, and casts it to a `string[]` */
export function getEnvVar(varName: string, asType: "stringArray"): undefined | string[]
/** Grabs an environment variable's value, and casts it to a `number[]` */
export function getEnvVar(varName: string, asType: "numberArray"): undefined | number[]
/** Grabs an environment variable's value, and casts it to a specific type (default string) */
export function getEnvVar<T extends ("string" | "number" | "stringArray" | "numberArray")>(varName: string, asType: T = "string" as T): undefined | (string | number | string[] | number[])
{
    const val = process.env[varName];

    if(!val)
        return undefined;

    let transform: (value: string) => unknown = v => v.trim();

    const commasRegex = /[.,،，٫٬]/g;

    switch(asType)
    {
    case "number":
        transform = v => parseInt(v.trim());
        break;
    case "stringArray":
        transform = v => v.trim().split(commasRegex);
        break;
    case "numberArray":
        transform = v => v.trim().split(commasRegex).map(n => parseInt(n));
        break;
    }

    return transform(val) as string; // I'm lazy and ts is happy, so we can all be happy and pretend this doesn't exist
}


interface Settings {
    debug: {
        bellOnReady: boolean;
    }
    moderation: {
        votesToBan: number;
        warningsUntilNotice: number;
    }
    client: {
        intents: GatewayIntentBits[];
    }
    embedColors: {
        default: ColorResolvable;
        success: ColorResolvable;
        gameLost: ColorResolvable;
        warning: ColorResolvable;
        error: ColorResolvable;
        contestWinner: ColorResolvable;
    }
    emojiList: string[];
    devs: string[];
    commands: {
        execEnabled: boolean;
    }
}
