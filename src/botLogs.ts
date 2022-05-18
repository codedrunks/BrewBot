import { Client, MessageEmbed, TextBasedChannel } from "discord.js";
import persistentData from "./persistentData";


let botLogsChannel: TextBasedChannel | undefined;

export function init(client: Client)
{
    const botLogs = persistentData.get("botLogs");
    botLogsChannel = client?.guilds.cache.find(g => g.id === botLogs?.guild)?.channels.cache.find(ch => ch.id === botLogs?.channel) as TextBasedChannel | undefined;
}

export function sendLogMsg(msg: string | MessageEmbed | MessageEmbed[])
{
    if(botLogsChannel)
    {
        if(typeof msg === "string")
            botLogsChannel.send(msg);
        else
            botLogsChannel.send({ embeds: Array.isArray(msg) ? msg : [msg] });
    }
}

export default {
    init,
    sendLogMsg,
};
