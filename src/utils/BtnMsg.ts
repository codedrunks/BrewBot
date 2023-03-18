import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, TextBasedChannel, APIButtonComponentWithCustomId, ButtonStyle } from "discord.js";
import { nanoid } from "nanoid";

import { btnListener } from "@src/registry";
import { EmitterBase } from "@utils/EmitterBase";
import { Tuple } from "@src/types";

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

export type ButtonsTuple = Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>;

/**
 * Wrapper for discord.js' `ButtonBuilder`  
 * Contains convenience methods for easier creation of messages with attached buttons
 */
export class BtnMsg extends EmitterBase
{
    readonly btns: ButtonBuilder[][];
    readonly msg: string | EmbedBuilder[] | null;

    readonly opts: BtnMsgOpts;

    readonly btnId: string;

    private timedOut = false;
    private timeoutId: NodeJS.Timeout | null = null;

    /**
     * Wrapper for discord.js' `ButtonBuilder`  
     * Contains convenience methods for easier creation of messages with attached buttons  
     * Use `.on("press")` to listen for button presses
     * @param message The message or reply content - set to null if you don't need a content
     * @param buttons Up to 5 rows of 5 ButtonBuilder instances - customIDs will be managed by this BtnMsg
     */
    constructor(message: string | EmbedBuilder | EmbedBuilder[] | null, buttons: ButtonBuilder | ButtonsTuple, options?: Partial<BtnMsgOpts>)
    {
        super();

        this.btnId = nanoid();

        this.msg = message instanceof EmbedBuilder ? [message] : message;

        this.btns = (Array.isArray(buttons) ? buttons : [[buttons]])
            .map((row, i) => {
                return row.map((b, j) => {
                    if(b.data.style !== ButtonStyle.Link)
                        b.setCustomId(`${this.btnId}@${i}_${j}`);
                    return b;
                });
            });

        const defaultOpts: BtnMsgOpts = {
            timeout: 14 * 60 * 1000,
        };

        this.opts = { ...defaultOpts, ...options };

        btnListener.addBtns(this.btns.flat());

        const onPress = (int: ButtonInteraction, btn: ButtonBuilder) => this.onPress(int, btn);

        btnListener.on("press", onPress);
        this.once("destroy", () => btnListener.removeListener("press", onPress));

        // prevents the bot from crashing on unknown interacations
        this.on("error", (err) => console.error("BtnMsg error:", err));

        if (this.opts.timeout > 0) {
            this.timeoutId = setTimeout(() => {
                this.timedOut = true;
                this.emit("timeout");
                this.destroy();
            }, this.opts.timeout);
        }
    }

    private onPress(int: ButtonInteraction, btn: ButtonBuilder)
    {
        if(this.btns.flat().find(b => (b.data as APIButtonComponentWithCustomId).custom_id === (btn.data as APIButtonComponentWithCustomId).custom_id))
            this.emit("press", btn, int);
    }

    /** Removes all listeners and triggers the registry to delete its reference to the buttons of this instance */
    public destroy()
    {
        if(this.destroyed)
            return;

        this.destroyed = true;

        this.emit("destroy", this.btns.flat().map(b => (b.data as APIButtonComponentWithCustomId).custom_id));

        this.eventNames()
            .forEach(e => this.removeAllListeners(e));

        btnListener.delBtns(this.btns.flat().map(b => (b.data as Partial<APIButtonComponentWithCustomId>).custom_id ?? "_"));
    }

    public getBtn(customId: string)
    {
        return this.btns.flat().find(b => (b.data as APIButtonComponentWithCustomId).custom_id === customId);
    }

    /**
     * Returns reply options that can be passed to `CommandInteraction.reply()`
     * @example ```ts
     * await int.reply(new BtnMsg().getReplyOpts())
     * ```
     * @deprecated Should be replaced with `getMsgOpts()`
     */
    public getReplyOpts()
    {
        return this.getMsgOpts();
    }

    /**
     * Returns message options that can be passed to the `TextBasedChannel.send()` function
     * @example ```ts
     * await channel.send(new BtnMsg().getMsgOpts())
     * ```
     */
    public getMsgOpts()
    {
        const actRows = this.toActionRowsBuilder(this.destroyed || this.timedOut);

        const btns = { components: actRows ?? [] };

        return Array.isArray(this.msg) ? {
            embeds: this.msg,
            ...btns,
        } : {
            content: this.msg ?? undefined,
            ...btns,
        };
    }

    /** Sends this message in the provided `channel` */
    public sendIn(channel: TextBasedChannel)
    {
        return channel.send(this.getMsgOpts());
    }

    /** Cancels and reinitiates the timeout */
    public resetTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);

            this.timeoutId = setTimeout(() => {
                this.emit("timeout");
                this.destroy();
            }, this.opts.timeout);
        }
    }

    protected toActionRowsBuilder(disableBtns = false): ActionRowBuilder<ButtonBuilder>[] | undefined
    {
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];

        if(this.btns.length > 0) {
            this.btns.map(row => {
                rows.push(new ActionRowBuilder<ButtonBuilder>().setComponents(disableBtns ? row.map(b => b.setDisabled(true)) : row));
                return row;
            });
            return rows;
        }
    }
}
