import { ButtonInteraction, InteractionReplyOptions, MessageActionRow, MessageButton, MessageEmbed, MessageOptions, TextBasedChannel } from "discord.js";
import EventEmitter from "events";
import { registerBtnMsg } from "./registry";


export interface ButtonMessage {
    on(event: "press", listener: (int: ButtonInteraction) => void): this;
}

export class ButtonMessage extends EventEmitter {
    private buttons: MessageButton[];
    private message: string | MessageEmbed[];
    
    constructor(message: string | MessageEmbed | MessageEmbed[], buttons: MessageButton | MessageButton[])
    {
        super();

        this.message = message instanceof MessageEmbed ? [message] : message;
        this.buttons = Array.isArray(buttons) ? buttons : [buttons];

        registerBtnMsg(this);
    }

    /** Returns message options that can be passed to any `reply()` or `send()` function */
    public getMsgOpts(): MessageOptions | InteractionReplyOptions
    {
        const btns = { components: [ this.toMessageActionRow() ]};

        return Array.isArray(this.message) ? {
            embeds: this.message,
            ...btns,
        } : {
            content: this.message,
            ...btns,
        };
    }

    public async sendIn(channel: TextBasedChannel)
    {
        return await channel.send(this.getMsgOpts());
    }

    protected toMessageActionRow(): MessageActionRow
    {
        return new MessageActionRow()
            .setComponents(...this.buttons);
    }
}
