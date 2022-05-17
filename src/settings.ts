import { ColorResolvable } from "discord.js";

interface Settings {
    embedColors: {
        default: ColorResolvable;
    }
}


export const settings: Settings = {
    embedColors: {
        default: "BLURPLE"
    }
};
