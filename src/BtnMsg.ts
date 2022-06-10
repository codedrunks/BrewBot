import { randomUUID } from "crypto";
import { ButtonInteraction, InteractionReplyOptions, MessageActionRow, MessageButton, MessageEmbed, MessageOptions, TextBasedChannel } from "discord.js";
import EventEmitter from "events";

import { registerBtnMsg } from "./registry";


interface BtnMsgOpts {
    /** In milliseconds - set to -1 to disable */
    timeout: number;
}


export interface BtnMsg {
    /** Gets emitted whenever a button was pressed */
    on(event: "press", listener: (btn: MessageButton, int: ButtonInteraction) => void): this;
}

/**
 * Wrapper for discord.js' `MessageButton`  
 * Contains convenience methods for easier creation of messages with attached buttons
 */
export class BtnMsg extends EventEmitter
{
    readonly id: string = randomUUID({ disableEntropyCache: true });

    readonly btns: MessageButton[];
    readonly msg: string | MessageEmbed[];

    private opts: BtnMsgOpts;

    /**
     * Wrapper for discord.js' `MessageButton`  
     * Contains convenience methods for easier creation of messages with attached buttons  
     * Use `.on("press")` to listen for button presses
     * @param message The message or reply content
     * @param buttons One or up to 5 MessageButton instances
     */
    constructor(message: string | MessageEmbed | MessageEmbed[], buttons: MessageButton | MessageButton[], options?: Partial<BtnMsgOpts>)
    {
        super();

        this.msg = message instanceof MessageEmbed ? [message] : message;
        this.btns = Array.isArray(buttons) ? buttons : [buttons];

        this.btns = this.btns.map((b, i) => {
            if(!b.url)
                b.customId = `${this.id}@${i}`;
            return b;
        });

        const defaultOpts: BtnMsgOpts = {
            timeout: -1,
        };

        this.opts = { ...defaultOpts, ...options };

        registerBtnMsg(this);
    }

    public destroy()
    {
        this.removeAllListeners("press");
    }

    public getBtn(customId: string)
    {
        return this.btns.find(b => b.customId === customId);
    }

    /**
     * Returns reply options that can be passed to the `CommandInteraction.reply()` function
     * @example ```ts
     * await int.reply(new BtnMsg("yo", new MessageButton()).getReplyOpts())
     * ```
     */
    public getReplyOpts(): InteractionReplyOptions
    {
        return this.getMsgOpts() as InteractionReplyOptions;
    }

    /**
     * Returns message options that can be passed to the `Message.send()` function
     * @example ```ts
     * await int.channel?.send(new BtnMsg("yo", new MessageButton()).getMsgOpts())
     * ```
     */
    public getMsgOpts(): MessageOptions
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
            .addComponents(this.btns);
    }
}
