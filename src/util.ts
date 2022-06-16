import { ColorResolvable, MessageEmbed } from "discord.js";
import { settings } from "./settings";

const defaultColor = settings.embedColors.default;

export function embedify(text: string, color?: ColorResolvable): MessageEmbed {
    return new MessageEmbed()
        .setDescription(text).setColor(color ?? defaultColor);
}

export function formatSeconds(seconds: number): string {
    const date = new Date(1970, 0, 1);
    date.setSeconds(seconds);

    return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
}

export function nowInSeconds(): number {
    return Math.round(new Date().getTime() / 1000);
}
