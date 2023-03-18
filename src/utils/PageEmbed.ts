import { Message, EmbedBuilder, ButtonInteraction, TextBasedChannel, ButtonBuilder, ButtonStyle, APIButtonComponentWithCustomId, CommandInteraction, User } from "discord.js";
import { time } from "@discordjs/builders";
import { clamp } from "svcorelib";
import { APIEmbed } from "discord-api-types/v10";
import { nanoid } from "nanoid";

import { EmitterBase } from "@utils/EmitterBase";
import { Command } from "@src/Command";
import { btnListener } from "@src/registry";
import { useEmbedify } from "@src/utils";
import { settings } from "@src/settings";
import { AnyInteraction, DiscordAPIFile, Tuple } from "@src/types";


type BtnType = "first" | "prev" | "next" | "last";

/** A page of a PageEmbed instance, defined as an array of EmbedBuilder or APIEmbed (or EmbedBuilderOptions). */
type EbdPage = APIEmbed | EmbedBuilder;

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
    /** Emitted whenever an extra button is pressed */
    on(event: "press", listener: (int: ButtonInteraction, type: BtnType) => void): this;
    /** Emitted whenever this PageEmbed times out and is going to deregister and destroy itself */
    on(event: "timeout", listener: () => void): this;
    /** Emitted on error and unhandled Promise rejection */
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
    private int?: AnyInteraction;
    private btns: ButtonBuilder[][];

    private pages: APIEmbed[] = [];
    private pageIdx = -1;

    private files: DiscordAPIFile[] = [];

    private readonly authorId;
    private allowAllUsers = false;

    private collectorRunning = false;
    private timedOut = false;

    readonly btnId: string;

    /**
     * A wrapper for EmbedBuilder that handles scrolling through multiple of them via ButtonBuilders
     * @param pages The pages to scroll through with buttons
     * @param authorId The ID of the user that sent the command
     * @param settings Additional settings (all have their defaults)
     * @param files Attachments you want uploaded for the embeds
     * @param extraButtons Up to 4 rows of 5 extra buttons per row (IDs are handled by the class)
     * You can access button IDs by first splitting on @ and removing the uuid and then splitting on _ to get a row and index (ID format is: uuid@row_index)
     */
    constructor(pages: EbdPage[], authorId: string, settings?: Partial<PageEmbedSettings>, files?: DiscordAPIFile[], extraButtons?: ButtonBuilder | Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4>)
    {
        super();

        this.btnId = nanoid();

        this.pages = pages.map(p => p instanceof EmbedBuilder ? p.toJSON() : p);
        this.files = files?.length ? files : [];

        const defSett: PageEmbedSettings = {
            firstLastBtns: true,
            goToPageBtn: true,
            timeout: 14 * 60 * 1000,
            overflow: true,
            allowAllUsersTimeout: -1,
        };

        this.settings = { ...defSett, ...(settings ?? {}) };

        const extraBtns = extraButtons ? (Array.isArray(extraButtons) ? extraButtons : [[extraButtons]])
            .map((row, i) => {
                return row.map((b, j) => {
                    if(b.data.style !== ButtonStyle.Link)
                        // we start from row 1 for the extra buttons if we have more than one page
                        // (meaning we the first row is occupied by the page controls)
                        b.setCustomId(`${this.btnId}@${this.pages.length > 1 ? i+1 : i}_${j}`);
                    return b;
                });
            }) : [];

        this.btns = this.pages.length > 1 ? [this.createBtns(), ...extraBtns] : extraBtns;

        btnListener.addBtns(this.btns.flat());

        const onPress = (int: ButtonInteraction, btn: ButtonBuilder) => this.onPress(int, btn);

        btnListener.on("press", onPress);
        this.once("destroy", () => btnListener.removeListener("press", onPress));

        this.authorId = authorId;

        this.settings.timeout >= 0 &&
            setTimeout(async () => {
                this.timedOut = true;
                this.emit("timeout");
                this.destroy();
            }, this.settings.timeout);

        if(this.settings.allowAllUsersTimeout === 0)
            this.setAllowAllUsers(true);
        else if(this.settings.allowAllUsersTimeout > 0)
            setTimeout(() => this.setAllowAllUsers(true), this.settings.allowAllUsersTimeout);
    }

    private async onPress(int: ButtonInteraction, btn: ButtonBuilder)
    {
        let btIdx;
        let btRow;
        this.btns.forEach((btnRow, row) => {
            btnRow.forEach(({ data }, i) => {
                if((data as APIButtonComponentWithCustomId).custom_id === (btn.data as APIButtonComponentWithCustomId).custom_id) {
                    btIdx = i;
                    btRow = row;
                }
            });
        });

        // if the page controls are shown and the button that was pressed is in the first row
        if(this.pages.length > 1 && btRow === 0 && btIdx !== undefined)
        {
            if(!int.channel)
                return;

            if(!this.pressAllowed(int.user.id) && this.msg?.createdTimestamp && this.settings.allowAllUsersTimeout > 0)
            {
                const useIn = this.msg.createdTimestamp + this.settings.allowAllUsersTimeout;

                const now = Date.now();

                setTimeout(() => int.editReply(useEmbedify("You can use the buttons now :)", settings.embedColors.success)),
                    clamp(useIn - now, 0, Number.MAX_SAFE_INTEGER));

                return int.reply({
                    ...useEmbedify(
                        useIn > now
                            ? `You can use these buttons ${time(new Date(useIn), "R")}`
                            : "You can't use these buttons yet", settings.embedColors.error
                    ),
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
                int.deferUpdate();
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

            if(!int.deferred || !int.replied)
                this.once("update", () => int.deferUpdate());
        // if one of the extra buttons is pressed
        } else if (btRow !== undefined && btIdx !== undefined) {
            this.emit("press", btn, int);
        } else {
            // NOTE: maybe log here ???
            throw new Error("The button that was pressed doesn't exist");
        }
    }

    private pressAllowed(userId: string)
    {
        return userId === this.authorId || this.allowAllUsers;
    }

    /** Destroys this instance, emits the "destroy" event and removes all event listeners */
    public async destroy()
    {
        const ids = this.btns.flat().map(b => (b.data as APIButtonComponentWithCustomId).custom_id);

        this.timedOut = true;

        await this.updateMsg(true);

        btnListener.delBtns(ids);

        this.emit("destroy", ids);

        this._destroy(false);
    }

    /** Whether all users can use the buttons (true) or only the author (false) */
    public getAllowAllUsers()
    {
        return this.allowAllUsers;
    }

    /** Change whether all users can use the buttons (true) or only the author (false) */
    public setAllowAllUsers(allowAll: boolean)
    {
        this.allowAllUsers = allowAll;
    }

    //#SECTION pages

    public getPages()
    {
        return this.pages;
    }

    /** Overrides the current set of pages. Automatically lowers the page index if necessary. */
    public setPages(pages: EbdPage[])
    {
        this.pages = pages.map(p => p instanceof EmbedBuilder ? p.toJSON() : p);

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

    /** Creates a MessageCollector so the user can go to an entered page - takes the initiating Command-/ButtonInteraction object as argument */
    public async askGoToPage({ user, channel }: { user: User, channel?: TextBasedChannel | null })
    {
        if(this.collectorRunning)
            return;

        if(channel)
        {
            const hintMsg = await this.msg?.reply({ ...useEmbedify(`<@${user.id}>, please type the number of the page you want to go to.`) });

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

            this.once("destroy", coll.stop);

            coll.on("end", () => {
                this.collectorRunning = false;
                hintMsg?.delete();
            });
        }
    }

    //#SECTION props

    // Creates the first row of buttons that contains the controls for the PageEmbed
    private createBtns()
    {
        const btns: ButtonBuilder[] = [
            new ButtonBuilder()
                .setLabel("Previous")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Primary),
        ];

        this.settings.goToPageBtn && btns.push(new ButtonBuilder()
            .setLabel("Go to")
            .setEmoji("🔢")
            .setStyle(ButtonStyle.Primary)
        );

        btns.push(new ButtonBuilder()
            .setLabel("Next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Primary)
        );

        if(this.settings.firstLastBtns)
        {
            btns.unshift(new ButtonBuilder()
                .setLabel("First")
                .setEmoji("⏮️")
                .setStyle(ButtonStyle.Secondary)
            );
            btns.push(new ButtonBuilder()
                .setLabel("Last")
                .setEmoji("⏭️")
                .setStyle(ButtonStyle.Secondary)
            );
        }

        // since this will always be the first row when there's more than 1 page, we set the row id to 0
        return btns.map((b, i) => b.setCustomId(`${this.btnId}@0_${i}`));
    }

    /** Returns properties that can be used to send or edit messages */
    public getMsgOpts(disableBtns = false)
    {
        if(this.pages.length === 0)
            return { embeds: [], components: [] };

        const page = this.pages?.[this.getPageIdx()];
        const file = this.files?.[this.getPageIdx()];

        if(!page)
            throw new Error(`PageEmbed index out of range: ${this.pageIdx} (allowed range: 0-${this.pages.length - 1})`);

        const btns = disableBtns ? this.btns.map(row => row.map(b => b.setDisabled(true))) : this.btns;

        return {
            embeds: [ page ],
            ...(this.pages.length === 1 && !btns.length ? { components: [] } : Command.useButtons(<Tuple<Tuple<ButtonBuilder, 1|2|3|4|5>, 1|2|3|4|5>>btns)),
            ...(file ? { files: [file] } : {})
        };
    }

    //#SECTION send

    /** Sends this PageEmbed in the specified `channel` */
    public async sendIn(channel: TextBasedChannel)
    {
        this.pageIdx = 0;
        return this.msg = await channel.send(this.getMsgOpts());
    }

    /** Replies to a passed interaction with this PageEmbed */
    public async reply(int: CommandInteraction | ButtonInteraction, ephemeral = false)
    {
        if(this.getPageIdx() < 0)
            this.setPageIdx(0);

        return int.reply({ ...this.getMsgOpts(), ephemeral });
    }

    /** Edits a passed interaction with the content of this PageEmbed */
    public async editReply(int: CommandInteraction | ButtonInteraction)
    {
        if(this.getPageIdx() < 0)
            this.setPageIdx(0);

        return int.editReply(this.getMsgOpts());
    }

    /** Edits the message with the currently stored local `msg` with this PageEmbed's content */
    public async updateMsg(removeButtons = false)
    {
        if(this.timedOut)
            removeButtons = true;

        const msgProps = this.getMsgOpts(removeButtons);

        if(this.int)
        {
            try {
                if(!this.msg)
                {
                    const m = await this.int?.fetchReply();
                    if(m instanceof Message)
                        this.setMsg(m);
                }
            }
            catch(e) { void(e); }

            if(this.int?.replied || this.int?.deferred)
                await this.int.editReply(msgProps);
            else
                await this.int?.reply(msgProps);
        }
        else if(this.msg && this.msg.editable)
            this.msg = await this.msg?.edit(msgProps);

        this.emit("update", this.msg);
    }

    /** Returns the Message object associated with this PageEmbed */
    public getMsg()
    {
        return this.msg;
    }

    /** If you want to send the message yourself, make sure to call this function so this instance has a reference to it! */
    public setMsg(msg: Message)
    {
        if(this.pageIdx === -1)
            this.pageIdx = 0;

        this.msg = msg;
    }

    /** Call this function once to reply to or edit an interaction with this PageEmbed. This is the interactions' equivalent of `sendIn()` */
    public async useInt(int: AnyInteraction, ephemeral = false)
    {
        if(!int.deferred)
            await int.deferReply();

        this.int = int;

        const m = await int.fetchReply();
        const msg = m instanceof Message ? m : undefined;

        msg && this.setMsg(msg);

        if(this.getPageIdx() < 0)
            this.setPageIdx(0);

        const updatePageEbd = async () => {
            int.replied || int.deferred
                ? await int.editReply(this.getMsgOpts())
                : await int.reply({ ...this.getMsgOpts(), ephemeral });
        };

        await updatePageEbd();
    }
}
