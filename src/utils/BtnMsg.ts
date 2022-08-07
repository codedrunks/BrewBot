import { randomUUID } from "crypto";
import { ButtonInteraction, EmojiIdentifierResolvable, InteractionReplyOptions, MessageActionRow, MessageButton, MessageButtonStyleResolvable, MessageEmbed, MessageOptions, TextBasedChannel } from "discord.js";


import { btnListener } from "@src/registry";
import { EmitterBase } from "@utils/EmitterBase";


interface BtnMsgOpts {
    /** In milliseconds - defaults to 30 minutes, set to -1 to disable */
    timeout: number;
}

export type ButtonOpts = {
    label: string,
    style: MessageButtonStyleResolvable,
    emoji?: EmojiIdentifierResolvable,
    url?: string,
}[];

export interface BtnMsg {
    /** Gets emitted whenever a button was pressed */
    on(event: "press", listener: (btn: MessageButton, int: ButtonInteraction) => void): this;
    /** Gets emitted when this BtnMsg times out */
    on(event: "timeout", listener: () => void): this;
    /** Gets emitted when this BtnMsg was destroyed and needs to be deleted from the registry */
    on(event: "destroy", listener: (btnIds: string[]) => void): this;
    /** Emitted on error and unhandled Promise rejection */
    on(event: "error", listener: (err: Error) => void): this;
}

/**
 * Wrapper for discord.js' `MessageButton`  
 * Contains convenience methods for easier creation of messages with attached buttons
 */
export class BtnMsg extends EmitterBase
{
    readonly id: string = randomUUID();

    readonly btns: MessageButton[];
    readonly msg: string | MessageEmbed[];

    readonly opts: BtnMsgOpts;

    /**
     * Wrapper for discord.js' `MessageButton`  
     * Contains convenience methods for easier creation of messages with attached buttons  
     * Use `.on("press")` to listen for button presses
     * @param message The message or reply content
     * @param buttons Up to 5 MessageButton instances - customIDs will be managed by this BtnMsg
     */
    constructor(message: string | MessageEmbed | MessageEmbed[], buttons: MessageButton | MessageButton[], options?: Partial<BtnMsgOpts>)
    constructor(message: string | MessageEmbed | MessageEmbed[], buttons: ButtonOpts, options?: Partial<BtnMsgOpts>)
    constructor(message: string | MessageEmbed | MessageEmbed[], buttons: ButtonOpts | MessageButton | MessageButton[], options?: Partial<BtnMsgOpts>)
    {
        super();

        this.msg = message instanceof MessageEmbed ? [message] : message;

        if(buttons instanceof MessageButton || (Array.isArray(buttons) && buttons[0] instanceof MessageButton))
            this.btns = Array.isArray(buttons) ? buttons as MessageButton[] : [buttons];
        else
        {
            const btns: MessageButton[] = [];

            buttons.forEach(b => {
                const mb = new MessageButton();
                b.label && mb.setLabel(b.label);
                b.style && mb.setStyle(b.style);
                b.emoji && mb.setEmoji(b.emoji as EmojiIdentifierResolvable);
                b.url && mb.setURL(b.url);

                btns.push(mb);
            });

            this.btns = btns;
        }

        this.btns = this.btns.map((b, i) => {
            if(!b.url)
                b.setCustomId(`${this.id}@${i}`);
            return b;
        });

        const defaultOpts: BtnMsgOpts = {
            timeout: 1000 * 60 * 30,
        };

        this.opts = { ...defaultOpts, ...options };

        btnListener.addBtns(this.btns);
        btnListener.on("press", (int, btn) => {
            if(this.btns.find(b => b.customId === btn.customId))
                this.emit("press", btn, int);
        });
    }

    /** Removes all listeners and triggers the registry to delete its reference to the buttons of this instance */
    public destroy()
    {
        if(this.destroyed)
            return;

        this.destroyed = true;

        this.emit("destroy", this.btns.map(b => b.customId));

        this.eventNames()
            .forEach(e => this.removeAllListeners(e));

        btnListener.delBtns(this.btns.map(b => b.customId ?? "_"));
    }

    public getBtn(customId: string)
    {
        return this.btns.find(b => b.customId === customId);
    }

    /**
     * Returns reply options that can be passed to `CommandInteraction.reply()`
     * @example ```ts
     * await int.reply(new BtnMsg().getReplyOpts())
     * ```
     */
    public getReplyOpts(): InteractionReplyOptions
    {
        return this.getMsgOpts() as InteractionReplyOptions;
    }

    /**
     * Returns message options that can be passed to the `TextBasedChannel.send()` function
     * @example ```ts
     * await channel.send(new BtnMsg().getMsgOpts())
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

    /** Sends this message in the provided `channel` */
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
