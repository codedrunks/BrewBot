import { Message as DjsMessage, PartialMessage } from "discord.js";
import { Event } from "../Event";


export class Message extends Event
{
    constructor()
    {
        // didn't wanna split this into two files so both new and edited messages are handled in this class
        super([ "messageCreate", "messageUpdate" ]);
    }

    async run(msg: DjsMessage<boolean> | PartialMessage, newMsg?: DjsMessage<boolean> | PartialMessage)
    {
        // ignore bot and system messages (welcome, nitro boost, community updates)
        if(msg.author?.bot || msg.system)
            return;

        if(typeof newMsg === "undefined")
        {
            // new message
            console.log("New message - content:", msg.content);
        }
        else
        {
            // edited message
            console.log("Edited message - from:", msg.content, "- to:", newMsg.content);
        }
    }
}
