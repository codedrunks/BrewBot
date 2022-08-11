import { GatewayIntentBits } from "discord-api-types/v10";
import { ColorResolvable } from "discord.js";
import dotenv from "dotenv";
import { Stringifiable } from "svcorelib";

const Intents = GatewayIntentBits;

dotenv.config();

export const settings: Settings = {
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
        gameWon: "GREEN",
        gameLost: "GREY",
        warning: "YELLOW",
        error: "DARK_RED",
        contestWinner: "GOLD",
    },
    /** When a user is warned this many times, a message is sent to the botLogs channel */
    warningsThreshold: 3,
    /** Incremental list of emojis used in reactions */
    emojiList: [ "🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹" ],
    guildID: "693878197107949572",
    messageLogChannel: "976942278637666376",
    devs: [
        "427491040468140043",
        "407351772575694879",
        "194507254249160704",
        "415597358752071693"
    ],
    devServer: "693878197107949572",
    commands: {
        execEnabled: envVarEquals("EXEC_CMD_ENABLED", false) ? false : true,
    },
};

/** Tests if the environment variable `varName` equals `value` - value is case insensitive */
function envVarEquals(varName: string, value: Stringifiable)
{
    return process.env[varName]?.toLowerCase() === value.toString().toLowerCase();
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
        gameWon: ColorResolvable;
        gameLost: ColorResolvable;
        warning: ColorResolvable;
        error: ColorResolvable;
        contestWinner: ColorResolvable;
    }
    warningsThreshold: number;
    emojiList: string[];
    guildID: string;
    messageLogChannel: string;
    devs: string[];
    devServer: string;
    commands: {
        execEnabled: boolean;
    }
}
