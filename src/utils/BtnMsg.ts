import { randomUUID } from "crypto";
import { ButtonInteraction, InteractionReplyOptions, ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageOptions, TextBasedChannel, APIButtonComponentWithURL, APIButtonComponentWithCustomId, ComponentEmojiResolvable } from "discord.js";

import { btnListener } from "@src/registry";
import { EmitterBase } from "@utils/EmitterBase";

interface BtnMsgOpts {
    /** In milliseconds - defaults to 30 minutes, set to -1 to disable */
    timeout: number;
}

export interface BtnMsg {
    /** Gets emitted whenever a button was pressed */
    on(event: "press", listener: (btn: ButtonBuilder, int: ButtonInteraction) => void): this;
    /** Gets emitted when this BtnMsg times out */
    on(event: "timeout", listener: () => void): this;
    /** Gets emitted when this BtnMsg was destroyed and needs to be deleted from the registry */
    on(event: "destroy", listener: (btnIds: string[]) => void): this;
    /** Emitted on error and unhandled Promise rejection */
    on(event: "error", listener: (err: Error) => void): this;
}

/**
 * Wrapper for discord.js' `ButtonBuilder`  
 * Contains convenience methods for easier creation of messages with attached buttons
 */
export class BtnMsg extends EmitterBase
{
    readonly btns: ButtonBuilder[];
    readonly msg: string | EmbedBuilder[];

    readonly opts: BtnMsgOpts;

    readonly btnId: string;

    private timedOut = false;

    /**
     * Wrapper for discord.js' `ButtonBuilder`  
     * Contains convenience methods for easier creation of messages with attached buttons  
     * Use `.on("press")` to listen for button presses
     * @param message The message or reply content
     * @param buttons Up to 5 ButtonBuilder instances - customIDs will be managed by this BtnMsg
     */
    constructor(message: string | EmbedBuilder | EmbedBuilder[], buttons: ButtonBuilder | ButtonBuilder[], options?: Partial<BtnMsgOpts>)
    constructor(message: string | EmbedBuilder | EmbedBuilder[], buttons: ButtonBuilder | ButtonBuilder[], options?: Partial<BtnMsgOpts>)
    {
        super();

        this.btnId = randomUUID();

        this.msg = message instanceof EmbedBuilder ? [message] : message;

        if(buttons instanceof ButtonBuilder || (Array.isArray(buttons) && buttons[0] instanceof ButtonBuilder))
            this.btns = Array.isArray(buttons) ? buttons as ButtonBuilder[] : [buttons];
        else
        {
            const btns: ButtonBuilder[] = [];

            buttons.forEach(b => {
                const mb = new ButtonBuilder();
                b.data.label && mb.setLabel(b.data.label);
                b.data.style && mb.setStyle(b.data.style);
                b.data.emoji && mb.setEmoji(b.data.emoji as ComponentEmojiResolvable);
                (b.data as Partial<APIButtonComponentWithURL>).url && mb.setURL((b.data as APIButtonComponentWithURL).url);

                btns.push(mb);
            });

            this.btns = btns;
        }

        this.btns = this.btns.map((b, i) => {
            if(!(b.data as Partial<APIButtonComponentWithURL>).url)
                b.setCustomId(`${this.btnId}@${i}`);
            return b;
        });

        const defaultOpts: BtnMsgOpts = {
            timeout: 1000 * 60 * 30,
        };

        this.opts = { ...defaultOpts, ...options };

        btnListener.addBtns(this.btns);

        const onPress = (int: ButtonInteraction, btn: ButtonBuilder) => this.onPress(int, btn);

        btnListener.on("press", onPress);
        this.once("destroy", () => btnListener.removeListener("press", onPress));

        this.opts.timeout > 0 && setTimeout(() => {
            this.timedOut = true;
            this.emit("timeout");
            this.destroy();
        }, this.opts.timeout);
    }

    private onPress(int: ButtonInteraction, btn: ButtonBuilder)
    {
        if(this.btns.find(b => (b.data as APIButtonComponentWithCustomId).custom_id === (btn.data as APIButtonComponentWithCustomId).custom_id))
            this.emit("press", btn, int);
    }

    /** Removes all listeners and triggers the registry to delete its reference to the buttons of this instance */
    public destroy()
    {
        if(this.destroyed)
            return;

        this.destroyed = true;

        this.emit("destroy", this.btns.map(b => (b.data as APIButtonComponentWithCustomId).custom_id));

        this.eventNames()
            .forEach(e => this.removeAllListeners(e));

        btnListener.delBtns(this.btns.map(b => (b.data as Partial<APIButtonComponentWithCustomId>).custom_id ?? "_"));
    }

    public getBtn(customId: string)
    {
        return this.btns.find(b => (b.data as APIButtonComponentWithCustomId).custom_id === customId);
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
        const actRow = this.toActionRowBuilder(this.destroyed || this.timedOut);

        const btns: Partial<MessageOptions> = { components: actRow ? [ actRow ] : [] };

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

    protected toActionRowBuilder(disableBtns = false): ActionRowBuilder<ButtonBuilder> | undefined
    {
        if(this.btns.length > 0 && !this.destroyed)
            return new ActionRowBuilder<ButtonBuilder>()
                .addComponents(disableBtns ? this.btns.map(b => b.setDisabled(true)) : this.btns);
    }
}
