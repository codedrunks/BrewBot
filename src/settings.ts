import { ColorResolvable, IntentsString } from "discord.js";


export const settings: Settings = {
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
        default: "GREYPLE",
        error: "DARK_RED"
    },
    /** When reached, sends a message to the moderators */
    warningsThreshold: 3,
};


interface Settings {
    client: {
        intents: IntentsString[];
    }
    embedColors: {
        default: ColorResolvable;
        error: ColorResolvable;
    }
    warningsThreshold: number;
}
