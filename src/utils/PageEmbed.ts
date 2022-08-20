import { Message, MessageEmbed, ButtonInteraction, TextBasedChannel, MessageButton } from "discord.js";
import { time } from "@discordjs/builders";
import { clamp } from "svcorelib";
import { APIEmbed } from "discord-api-types/v10";
import { EmitterBase } from "@utils/EmitterBase";
import { Command } from "@src/Command";
import * as registry from "@src/registry";
import { randomUUID } from "crypto";
import { useEmbedify } from "./embedify";
import { settings } from "@src/settings";


type BtnType = "first" | "prev" | "next" | "last";

/** A page of a PageEmbed instance, defined as an array of MessageEmbed or APIEmbed (or MessageEmbedOptions). */
type EbdPage = APIEmbed | MessageEmbed;

interface PageEmbedSettings {
    /** Whether the "first" and "last" buttons are enabled - defaults to true */
    firstLastBtns: boolean;
    /** Whether the "go to page" button is enabled - defaults to true */
    goToPageBtn: boolean;
    /**
     * After how many milliseconds this PageEmbed times out, after which it deregisters and destroys itself.  
     * Defaults to 30 minutes.
     */
    timeout: number;
    /** Whether the pages automatically overflow at the beginning and end - defaults to true */
    overflow: boolean;
    /**
     * Set this to `0` to enable everyone to use the buttons.  
     * Set to a positive number to wait for this timeout in ms until allowing others to use the buttons.  
     * Default is `-1` (only author can use them)
     */
    allowAllUsersTimeout: number;
    // TODO: embedTemplate function to allow modifying the pages on the fly without editing the pages prop
}


export interface PageEmbed extends EmitterBase
{
    /** Emitted whenever a button was pressed - the passed interaction is automatically `.deferUpdate()`'d */
    on(event: "press", listener: (int: ButtonInteraction, type: BtnType) => void): this;
    /** Emitted whenever this PageEmbed times out and is going to deregister and destroy itself */
    on(event: "timeout", listener: () => void): this;
    /** Emitted on unhandled Promise rejection */
    on(event: "error", listener: (err: Error) => void): this;
    /** Gets emitted when this PageEmbed has finished */
    on(event: "destroy", listener: (btnIds: string[]) => void): this;
    /** Gets emitted when this PageEmbed's associated message was edited */
    on(event: "update", listener: (msg?: Message) => void): this;
}

export class PageEmbed extends EmitterBase
{
    private readonly settings: PageEmbedSettings;

    private msg?: Message;
    private btns: MessageButton[];

    private pages: APIEmbed[] = [];
    private pageIdx = -1;

    private readonly authorId;
    private allowAllUsers = false;

    private collectorRunning = false;
    private timedOut = false;

    private readonly btnId = randomUUID();

    /**
     * A wrapper for MessageEmbed that handles scrolling through multiple of them via MessageButtons
     * @param pages The pages to scroll through with buttons
     * @param authorId The ID of the user that sent the command
     * @param settings Additional settings (all have their defaults)
     */
    constructor(pages: EbdPage[], authorId: string, settings?: Partial<PageEmbedSettings>)
    {
        super();

        this.setPages(pages);

        const defSett: PageEmbedSettings = {
            firstLastBtns: true,
            goToPageBtn: true,
            timeout: 30 * 60 * 1000,
            overflow: true,
            allowAllUsersTimeout: -1,
        };

        this.settings = { ...defSett, ...(settings ?? {}) };

        this.btns = this.createBtns();

        registry.btnListener.addBtns(this.btns);
        registry.btnListener.on("press", async (int, btn) => {
            let btIdx;
            this.btns.forEach(({ customId }, i) => {
                if(customId === btn.customId)
                    btIdx = i;
            });

            if(btIdx !== undefined)
            {
                await int.deferUpdate();
                await this.onPress(int, btIdx);
            }
        });

        this.authorId = authorId;

        this.settings.timeout >= 0 &&
            setTimeout(() => {
                this.timedOut = true;
                this.emit("timeout");
                this.destroy();
            }, this.settings.timeout);

        if(this.settings.allowAllUsersTimeout === 0)
            this.setAllowAllUsers(true);
        else if(this.settings.allowAllUsersTimeout > 0)
            setTimeout(() => this.setAllowAllUsers(true), this.settings.allowAllUsersTimeout);
    }

    private onPress(int: ButtonInteraction, btIdx: number)
    {
        if(!int.channel)
            return;

        if(!this.pressAllowed(int.user.id) && this.msg?.createdTimestamp)
        {
            const useIn = this.msg.createdTimestamp + this.settings.allowAllUsersTimeout;

            setTimeout(() => int.editReply(useEmbedify("You can use the buttons now :)", settings.embedColors.gameWon)),
                clamp(useIn - Date.now(), 0, Number.MAX_SAFE_INTEGER));

            return int.reply({
                ...useEmbedify(useIn
                    ? `You can use these buttons ${time(new Date(useIn), "R")}`
                    : "You can't use these buttons yet", settings.embedColors.error),
                ...(!int.replied ? { ephemeral: true } : {}),
            });
        }

        const btns2 = ["prev"];
        this.settings.goToPageBtn && btns2.push("goto");
        btns2.push("next");
        const btns4 = ["first", ...btns2, "last"];

        const type = (this.settings.firstLastBtns ? btns4 : btns2)[btIdx];

        switch(type)
        {
        case "first":
            this.first();
            break;
        case "prev":
            this.prev();
            break;
        case "goto":
            return this.askGoToPage(int);
        case "next":
            this.next();
            break;
        case "last":
            this.last();
            break;
        default:
            return;
        }

        this.emit("press", int, type);
    }

    private pressAllowed(userId: string)
    {
        return userId === this.authorId || this.allowAllUsers;
    }

    /** Destroys this instance, emits the "destroy" event and removes all event listeners */
    public async destroy()
    {
        const ids = this.btns.map(b => b.customId);

        await this.updateMsg(true);

        registry.btnListener.delBtns(ids);

        this.emit("destroy", ids);

        this._destroy(false);
    }

    /** Change whether all users can use the buttons (true) or only the author (false) */
    public setAllowAllUsers(allowAll: boolean)
    {
        this.allowAllUsers = allowAll;
    }

    /** Returns the Message object that contains the PageEmbed */
    public getMsg()
    {
        return this.msg;
    }

    //#SECTION pages

    public getPages()
    {
        return this.pages;
    }

    /** Overrides the current set of pages. Automatically lowers the page index if necessary. */
    public setPages(pages: EbdPage[])
    {
        this.pages = pages.map(p => p instanceof MessageEmbed ? p.toJSON() : p);

        if(this.pageIdx > this.pages.length - 1)
            this.setPageIdx(this.pages.length - 1);
        else
            this.updateMsg();
    }

    /** Sets the current page index. Number is automatically clamped between 0 and max index. */
    public setPageIdx(page: number)
    {
        this.pageIdx = this.pages.length === 0 ? -1 : clamp(page, 0, this.pages.length - 1);

        this.updateMsg();
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
        let newIdx = this.getPageIdx() - 1;

        if(this.settings.overflow && newIdx < 0)
            newIdx = this.pages.length - 1;

        this.setPageIdx(newIdx);
    }

    /** Goes to the next page. Overflows automatically according to the settings. */
    public next()
    {
        let newIdx = this.getPageIdx() + 1;

        if(this.settings.overflow && newIdx > this.pages.length - 1)
            newIdx = 0;

        this.setPageIdx(newIdx);
    }

    /** Goes to the last page */
    public last()
    {
        this.setPageIdx(this.pages.length - 1);
    }

    /** Creates a MessageCollector so the user can go to an entered page */
    public async askGoToPage({ user, channel }: ButtonInteraction)
    {
        if(this.collectorRunning)
            return;

        if(channel && this.msg)
        {
            const hintMsg = await this.msg.reply(useEmbedify("Please type the number of the page you want to go to."));

            this.collectorRunning = true;

            const coll = channel.createMessageCollector({
                filter: (m => m.author.id === user.id && this.pressAllowed(user.id)),
                dispose: true,
                time: 1000 * 30,
            });

            const autoDel = (m?: Message) => setTimeout(() => m?.deletable && m.delete(), 1000 * 5);

            coll.on("collect", async (msg) => {
                const raw = msg.content.trim();
                const num = parseInt(raw);

                if(raw.match(/[\d]+/) && !isNaN(num))
                {
                    autoDel(msg);

                    if(num < 1)
                    {
                        const m = await msg.reply(useEmbedify("This number is too low (min. possible page is 1)", settings.embedColors.error));
                        autoDel(m);
                        return;
                    }
                    if(num > this.pages.length)
                    {
                        const m = await msg.reply(useEmbedify(`This number is too high (max. possible page is ${this.pages.length})`, settings.embedColors.error));
                        autoDel(m);
                        return;
                    }

                    msg.delete();

                    this.setPageIdx(num - 1);
                    coll.stop();
                }
            });

            this.on("destroy", () => {
                coll.stop();
            });

            coll.on("end", () => {
                this.collectorRunning = false;
                hintMsg.delete();
            });
        }
    }

    //#SECTION props

    private createBtns()
    {
        const btns: MessageButton[] = [
            new MessageButton()
                .setLabel("Previous")
                .setEmoji("◀️")
                .setStyle("PRIMARY"),
        ];

        this.settings.goToPageBtn && btns.push(new MessageButton()
            .setLabel("Go to")
            .setEmoji("🔢")
            .setStyle("PRIMARY")
        );

        btns.push(new MessageButton()
            .setLabel("Next")
            .setEmoji("▶️")
            .setStyle("PRIMARY")
        );

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
        if(this.pages.length === 0)
            return { embeds: [], components: [] };

        const page = this.pages?.[this.getPageIdx()];

        if(!page)
            throw new Error(`PageEmbed index out of range: ${this.pageIdx} (allowed range: 0-${this.pages.length - 1})`);

        return {
            embeds: [ page ],
            ...(this.pages.length === 1 ? { components: [] } : Command.useButtons(this.btns)),
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
    public async updateMsg(removeButtons = false)
    {
        if(this.timedOut)
            removeButtons = true;

        if(this.msg && this.msg.editable)
        {
            const m = await this.msg.edit({ ...this.getMsgProps(), ...(removeButtons ? { components: [] } : {})});
            this.emit("update", m);
        }
    }

    /** If you want to send the message yourself, make sure to call this function so this instance has a reference to it! */
    public setMsg(msg: Message)
    {
        if(this.pageIdx === -1)
            this.pageIdx = 0;

        this.msg = msg;
    }
}
