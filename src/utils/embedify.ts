import { ColorResolvable, EmbedBuilder } from "discord.js";
import { settings } from "@src/settings";

export function embedify(text: string, color?: ColorResolvable): EmbedBuilder {
    return new EmbedBuilder()
        .setDescription(text).setColor(color ?? settings.embedColors.default);
}

/**
 * Like embedify, but can be spread onto a `int.reply()` or `msg.edit()` etc.
 * @example ```ts
 * await int.reply({ ...useEmbedify("helo"), ...Command.useButtons(btns), attachments: [...] });
 * await msg.edit(useEmbedify("helo"));
 * ```
 */
export function useEmbedify(text: string, color?: ColorResolvable)
{
    return { embeds: [ embedify(text, color) ]};
}
