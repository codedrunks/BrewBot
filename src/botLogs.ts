import { Client, EmbedBuilder, TextBasedChannel } from "discord.js";
import persistentData from "@src/persistentData";


let botLogsChannel: TextBasedChannel | undefined;

export function init(client: Client)
{
    const botLogs = persistentData.get("botLogs");
    botLogsChannel = client?.guilds.cache.find(g => g.id === botLogs?.guild)?.channels.cache.find(ch => ch.id === botLogs?.channel) as TextBasedChannel | undefined;
}

/** @deprecated This needs to be overhauled */
export async function sendLogMsg(msg: string | EmbedBuilder | EmbedBuilder[])
{
    if(botLogsChannel)
    {
        if(typeof msg === "string")
            return await botLogsChannel.send(msg);
        else
            return await botLogsChannel.send({ embeds: Array.isArray(msg) ? msg : [msg] });
    }
}

export default {
    init,
    sendLogMsg,
};
