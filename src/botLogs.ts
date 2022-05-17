import { Client, TextBasedChannel } from "discord.js";
import persistentData from "./persistentData";


let botLogsChannel: TextBasedChannel | undefined;

export function init(client: Client)
{
    const botLogs = persistentData.get("botLogs");
    botLogsChannel = client?.guilds.cache.find(g => g.id === botLogs?.guild)?.channels.cache.find(ch => ch.id === botLogs?.channel) as TextBasedChannel | undefined;
}

export function sendLogMsg(msg: string)
{
    botLogsChannel && botLogsChannel.send(msg);
}

export default {
    init,
    sendLogMsg,
};
