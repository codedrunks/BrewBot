import { ColorResolvable, MessageEmbed } from "discord.js";
import { settings } from './settings';

const defaultColor = settings.embedColors.default;

export function embedify(text: string, color?: ColorResolvable): MessageEmbed {
    return new MessageEmbed()
        .setDescription(text).setColor(color ?? defaultColor);
}