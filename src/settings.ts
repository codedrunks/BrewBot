import { ColorResolvable } from "discord.js";

interface Settings {
    embedColors: {
        default: ColorResolvable;
    }
    warningsThreshold: number;
}


export const settings: Settings = {
    embedColors: {
        default: "LUMINOUS_VIVID_PINK"
    },
    /** When reached, sends a message to the moderators */
    warningsThreshold: 3,
};
