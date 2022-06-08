import { ColorResolvable } from "discord.js";

interface Settings {
    embedColors: {
        default: ColorResolvable;
    }
    warningsThreshold: number;
    guildID: string,
    messageLogChannel: string;
}

export const settings: Settings = {
    embedColors: {
        default: "LUMINOUS_VIVID_PINK"
    },
    /** When reached, sends a message to the moderators */
    warningsThreshold: 3,
    guildID: "693878197107949572",
    messageLogChannel: "976942278637666376"
};
