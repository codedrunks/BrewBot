import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { getGuildSettings } from "./database/guild";

let client: Client;

export async function init(cl: Client)
{
    client = cl;
}

/** @deprecated This needs to be overhauled */
export async function sendLogMsg(guildId: string, msg: string | EmbedBuilder | EmbedBuilder[])
{
    const gs = await getGuildSettings(guildId);

    if(gs?.botLogChannel)
    {
        const botLogChannel = client.guilds.cache.find(g => g.id === guildId)?.channels.cache.find(c => c.id === gs.botLogChannel) as TextChannel | undefined;

        if(typeof msg === "string")
            return await botLogChannel?.send(msg);
        else
            return await botLogChannel?.send({ embeds: Array.isArray(msg) ? msg : [msg] });
    }
}

export default {
    init,
    sendLogMsg,
};
