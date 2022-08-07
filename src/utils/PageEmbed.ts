import { Message, MessageEmbed, ButtonInteraction, TextBasedChannel, MessageButton } from "discord.js";
import { clamp } from "svcorelib";
import { APIEmbed } from "discord-api-types/v10";
import { EmitterBase } from "@utils/EmitterBase";
import { Command } from "@src/Command";
import * as registry from "@src/registry";
import { randomUUID } from "crypto";


type BtnType = "first" | "prev" | "next" | "last";

/** A page of a PageEmbed instance, defined as an array of MessageEmbed or APIEmbed (or MessageEmbedOptions). */
type EbdPage = APIEmbed | MessageEmbed;

interface PageEmbedSettings {
    /** Whether the "first" and "last" buttons are enabled - defaults to true */
    firstLastBtns: boolean;
    /** After how many milliseconds this PageEmbed times out, after which it deregisters and destroys itself - defaults to 30 minutes */
    timeout: number;
    /** Whether the pages automatically overflow at the beginning and end - defaults to true */
    overflow: boolean;
}


export interface PageEmbed extends EmitterBase
{
    /** Emitted whenever a button was pressed */
    on(event: "press", listener: (int: ButtonInteraction, type: BtnType) => void): this;
    /** Emitted whenever this PageEmbed times out and is going to deregister and destroy itself */
    on(event: "timeout", listener: () => void): this;
    /** Emitted on error and unhandled Promise rejection */
    on(event: "error", listener: (err: Error) => void): this;
    /** Gets emitted when this PageEmbed has finished */
    on(event: "destroy", listener: (btnIds: string[]) => void): this;
    /** Gets emitted when this PageEmbed is about to be edited */
    on(event: "update", listener: () => void): this;
}

export class PageEmbed extends EmitterBase
{
    private readonly settings: PageEmbedSettings;

    private msg?: Message;
    private btns: MessageButton[];

    private pages: APIEmbed[] = [];
    private pageIdx = -1;

    private readonly btnId = randomUUID();

    constructor(pages: EbdPage[], settings?: Partial<PageEmbedSettings>)
    {
        super();

        this.setPages(pages);

        const defSett: PageEmbedSettings = {
            firstLastBtns: true,
            timeout: 30 * 60 * 1000,
            overflow: true,
        };

        this.settings = { ...defSett, ...(settings ?? {}) };

        this.btns = this.createBtns();

        registry.btnListener.addBtns(this.btns);
        registry.btnListener.on("press", (int, btn) => {
            const btns2 = ["prev", "next"];
            const btns4 = ["first", ...btns2, "last"];

            let btIdx;
            this.btns.forEach(({ customId }, i) => {
                if(customId === btn.customId)
                    btIdx = i;
            });

            btIdx !== undefined && this.emit("press", int, (this.settings.firstLastBtns ? btns4 : btns2)[btIdx]);
        });
    }

    /** Destroys this instance, emits the "destroy" event, then removes all event listeners */
    public destroy()
    {
        this._destroy();
        registry.btnListener.delBtns(this.btns.map(b => b.customId));
    }

    //#SECTION pages

    /** Overrides the current set of pages. Automatically lowers the page index if necessary. */
    public setPages(pages: EbdPage[])
    {
        this.pages = pages.map(p => p instanceof MessageEmbed ? p.toJSON() : p);

        if(this.pageIdx > this.pages.length - 1)
            this.setPageIdx(this.pages.length - 1);
    }

    /** Sets the current page index. Number is automatically clamped between 0 and max index. */
    public setPageIdx(page: number)
    {
        this.pageIdx = clamp(page, 0, this.pages.length - 1);

        this.emit("update");
    }

    /** Returns the current page index - defaults to -1 */
    public getPageIdx()
    {
        return this.pageIdx;
    }

    //#SECTION nav

    /** Goes to the first page */
    public first()
    {
        this.setPageIdx(0);
    }

    /** Goes to the previous page. Overflows automatically according to the settings. */
    public prev()
    {
        let newIdx = this.pageIdx - 1;

        if(this.settings.overflow && newIdx < 0)
            newIdx = this.pages.length - 1;
        else return;

        this.setPageIdx(newIdx);
    }

    /** Goes to the next page. Overflows automatically according to the settings. */
    public next()
    {
        let newIdx = this.pageIdx + 1;

        if(this.settings.overflow && newIdx > this.pages.length - 1)
            newIdx = 0;
        else return;

        this.setPageIdx(newIdx);
    }

    /** Goes to the last page */
    public last()
    {
        this.setPageIdx(this.pages.length - 1);
    }

    //#SECTION props

    private createBtns()
    {
        const btns: MessageButton[] = [
            new MessageButton()
                .setLabel("Previous")
                .setEmoji("◀️")
                .setStyle("PRIMARY"),
            new MessageButton()
                .setLabel("Next")
                .setEmoji("▶️")
                .setStyle("PRIMARY"),
        ];

        if(this.settings.firstLastBtns)
        {
            btns.unshift(new MessageButton()
                .setLabel("First")
                .setEmoji("⏮️")
                .setStyle("SECONDARY")
            );
            btns.push(new MessageButton()
                .setLabel("Last")
                .setEmoji("⏭️")
                .setStyle("SECONDARY")
            );
        }

        return btns.map((b, i) => b.setCustomId(`${this.btnId}@${i}`));
    }

    /** Returns properties that can be used to send or edit messages */
    public getMsgProps()
    {
        const page = this.pages?.[this.pageIdx];

        if(!page)
            throw new Error(`PageEmbed index out of range: ${this.pageIdx} (allowed range: 0-${this.pages.length - 1})`);

        return {
            embeds: [ page ],
            ...Command.useButtons(this.btns),
        };
    }

    //#SECTION send

    /** Sends this PageEmbed in the specified `channel` */
    public async sendIn(channel: TextBasedChannel)
    {
        this.pageIdx = 0;
        return this.msg = await channel.send(this.getMsgProps());
    }

    /** Edits the message with the currently stored local `msg` */
    protected async updateMsg()
    {
        return this.msg ? await this.msg.edit(this.getMsgProps()) : undefined;
    }

    /** If you send the message yourself, make sure to call this function so this instance has a reference to it! */
    public setMessage(msg: Message)
    {
        if(this.pageIdx === -1)
            this.pageIdx = 0;

        this.msg = msg;
    }
}