import { Message, MessageEmbed, ButtonInteraction, MessageEmbedOptions, TextBasedChannel } from "discord.js";
import { clamp } from "svcorelib";
import { EmitterBase } from "@utils/EmitterBase";


type BtnType = "first" | "prev" | "next" | "last";

/** A page of a PageEmbed instance, defined as a MessageEmbedOptions object. Footer prop will be overridden. */
type EbdPage = MessageEmbedOptions;

interface PageEmbedSettings {
    /** Whether the "first" and "last" buttons are enabled - defaults to true */
    firstLastEnabled: boolean;
    /** After how many milliseconds this PageEmbed times out, after which it deregisters and destroys itself */
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
}

export class PageEmbed extends EmitterBase
{
    public readonly pages: EbdPage[];

    private readonly settings: PageEmbedSettings;

    private pageIdx = -1;
    private msg?: Message;

    constructor(pages: EbdPage[], settings?: Partial<PageEmbedSettings>)
    {
        super();

        this.pages = pages;

        const defSett: PageEmbedSettings = {
            firstLastEnabled: true,
            timeout: 30 * 60 * 1000,
            overflow: true,
        };

        this.settings = { ...defSett, ...(settings ?? {}) };
    }

    /** Sets the current page index. Number is automatically clamped between 0 and max index. */
    public setPage(page: number)
    {
        this.pageIdx = clamp(page, 0, this.pages.length - 1);
    }

    /** Returns the current page index */
    public getPage()
    {
        return this.pageIdx;
    }

    /** Returns properties that can be used to send or edit messages */
    public getMsgProps()
    {
        const opts = this.pages[this.pageIdx];

        if(!opts)
            throw new Error(`PageEmbed index out of range: ${this.pageIdx} (allowed range: 0-${this.pages.length - 1})`);

        return { embeds: [
            new MessageEmbed(opts),
        ]};
    }

    public async sendIn(channel: TextBasedChannel)
    {
        return this.msg = await channel.send({ ...this.getMsgProps() });
    }
}