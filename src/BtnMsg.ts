import { randomUUID } from "crypto";
import { ButtonInteraction, InteractionReplyOptions, MessageActionRow, MessageButton, MessageEmbed, MessageOptions, TextBasedChannel } from "discord.js";
import EventEmitter from "events";

import { registerBtnMsg } from "./registry";


export interface BtnMsg {
    /** Gets emitted whenever a button was pressed */
    on(event: "press", listener: (int: ButtonInteraction) => void): this;
}

/**
 * Wrapper for discord.js' `MessageButton`  
 * Contains convenience methods for easier creation of messages with attached buttons
 */
export class BtnMsg extends EventEmitter
{
    /** Custom ID */
    readonly id: string;

    private btns: MessageButton[];
    private msg: string | MessageEmbed[];

    constructor(message: string | MessageEmbed | MessageEmbed[], buttons: MessageButton | MessageButton[])
    {
        super();

        this.id = randomUUID({ disableEntropyCache: true });

        this.msg = message instanceof MessageEmbed ? [message] : message;
        this.btns = Array.isArray(buttons) ? buttons : [buttons];

        this.btns = this.btns.map(b => {
            b.customId = this.id;
            return b;
        });

        registerBtnMsg(this);
    }

    /**
     * Returns message options that can be passed to any `reply()` or `send()` function
     * @example `await int.reply(new ButtonMessage("yo", new MessageButton()).getMsgOpts())`
     */
    public getMsgOpts(): MessageOptions | InteractionReplyOptions
    {
        const btns: Partial<MessageOptions> = { components: [ this.toMessageActionRow() ]};

        return Array.isArray(this.msg) ? {
            embeds: this.msg,
            ...btns,
        } : {
            content: this.msg,
            ...btns,
        };
    }

    /** Sends this message in a channel */
    public sendIn(channel: TextBasedChannel)
    {
        return channel.send(this.getMsgOpts());
    }

    protected toMessageActionRow(): MessageActionRow
    {
        return new MessageActionRow()
            .setComponents(...this.btns);
    }
}
