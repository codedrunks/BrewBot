import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { ButtonInteraction, Client, Collection, MessageButton, ModalSubmitInteraction } from "discord.js";

import { Command } from "@src/Command";
import { Event } from "@src/Event";
import { commands } from "@src/commands";
import { CtxMenu } from "@src/CtxMenu";
import { contextMenus } from "@src/context";
import { events } from "@src/events";
import { Modal } from "@utils/Modal";

import { initHelp } from "@commands/util/Help";
import EventEmitter from "events";
import { embedify } from "./utils";
import { settings } from "./settings";


const rest = new REST({ version: "10" })
    .setToken(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

let client: Client;

/** Array of all registered Command instances */
const cmds: Command[] = [];
/** Array of all registered CtxMenu instances */
const ctxMenus: CtxMenu[] = [];
/** Array of all registered Event instances */
const evts: Event[] = [];
// /** Map of all registered BtnMsg instances */
// const btnMsgs = new Collection<string, BtnMsg>();
/** Map of all registered Modal instances */
const modals = new Collection<string, Modal>();


export function initRegistry(cl: Client)
{
    client = cl;
}


//#MARKER commands & context menus


export function getCommands()
{
    return cmds;
}

export function getCtxMenus()
{
    return ctxMenus;
}

/** Registers all slash commands for the specified guild or guilds */
export async function registerGuildCommands(guildID: string[]): Promise<void>
export async function registerGuildCommands(guildID: string): Promise<void>
export async function registerGuildCommands(...guildIDs: (string|string[])[]): Promise<void>
{
    if(!client)
        throw new Error("Registry isn't initialized yet!");

    const gid = guildIDs[0];
    const guilds = Array.isArray(gid) ? gid : [gid];

    try
    {
        for(const CmdClass of commands)
            !cmds.find(c => c.constructor.name === CmdClass.constructor.name) && cmds.push(new CmdClass(client));
    }
    catch(err)
    {
        console.error(err);
        process.exit(1);
    }

    for(const CtxClass of contextMenus)
        ctxMenus.push(new CtxClass());

    const slashCmds = cmds
        .filter(c => c.enabled)
        .map(c => c.slashCmdJson)
        .concat(ctxMenus.map(c => c.ctxMenuJson));

    initHelp();


    // use this when ready for production, as global commands are cached and take an hour to update across guilds - guild commands on the other hand update instantly
    // see https://discordjs.guide/interactions/slash-commands.html#global-commands
    // 
    // await rest.put(
    //     Routes.applicationCommands(env.CLIENT_ID ?? "ERR_NO_ENV"), {
    //         body: slashCmds
    //     },
    // );
    // 
    // console.log(`• Registered ${k.green(slashCmds.length)} global slash command${slashCmds.length != 1 ? "s" : ""}`);

    // register guild commands
    for await(const guild of guilds)
    {
        // console.log(`Registering guild commands in ${client.guilds.cache.find(g => g.id === guild)?.name}`);

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID ?? "ERR_NO_ENV", guild), {
                body: slashCmds
            },
        );
    }
}


//#MARKER events


export function getEvents()
{
    return evts;
}

/**
 * Registers bot client events.  
 * Needs to be run once at bot startup.
 */
export function registerEvents()
{
    if(!client)
        throw new Error("Registry isn't initialized yet!");

    events.forEach(EvtClass => evts.push(new EvtClass()));

    // listen for events

    for(const ev of evts)
    {
        if(!ev.enabled) continue;

        for(const evName of ev.names)
            client.on(evName, async (...args) => void await ev.run(...args));
    }

    return evts;
}


//#MARKER buttons


interface BtnListener {
    /**
     * Emitted when a button is pressed. Gets passed the instance of the clicked button.  
     * Make sure to check that you're responding to the correct `btn`'s interaction by validating the customId!
     */
    on(event: "press", listener: (int: ButtonInteraction, btn: MessageButton) => void): this;
}

// TODO: I'm pretty sure this causes memory leaks if the events aren't cleaned up -sv
class BtnListener extends EventEmitter
{
    private btns = new Collection<string, MessageButton>();

    constructor()
    {
        super({ captureRejections: true });
    }

    /** Adds multiple MessageButtons. Throws an error if there's no customId props! */
    public addBtns(btns: MessageButton[]): void
    /** Adds one MessageButton. Throws an error if there's no customId prop! */
    public addBtns(btn: MessageButton): void
    public addBtns(btns: MessageButton | MessageButton[]): void
    {
        btns = Array.isArray(btns) ? btns : [btns];

        btns.forEach(bt => {
            if(!bt.customId)
                throw new TypeError(`MessageButton "${bt.label}/${bt.style}" doesn't have a customId`);
            this.btns.set(bt.customId, bt);
        });
    }

    /** Deletes multiple MessageButtons by their customId's. Invalid IDs are ignored. */
    public delBtns(customIDs?: (string | null)[]): void
    /** Deletes one  MessageButton by its customId. Invalid ID is ignored. */
    public delBtns(customId?: string): void
    public delBtns(customIDs?: string | (string | null)[]): void
    {
        const ids = Array.isArray(customIDs) ? customIDs : [customIDs];

        ids.forEach(id => id && this.btns.delete(id));
    }

    /** Returns all buttons that are currently registered, as a Collection of customId and MessageButton instances */
    public getBtns()
    {
        return this.btns;
    }

    /**
     * Called by bot.ts to emit the "press" event on this BtnListener with the correct parameters.  
     * ❗ Don't call this yourself ❗
     */
    public async emitBtnPressed(int: ButtonInteraction)
    {
        const bt = this.btns.get(int.customId);
        bt && this.emit("press", int, bt);
    }
}

/** This instance manages all MessageButtons and emits events when they are clicked. */
export const btnListener = new BtnListener();


// export function getBtnMsgs()
// {
//     return btnMsgs;
// }

// /**
//  * Registers a `BtnMsg` instance - this is done automatically in its constructor, don't run this function yourself!
//  * @private
//  */
// export function registerBtnMsg(btnMsg: BtnMsg)
// {
//     const btIds = btnMsg.btns
//         .map(b => b.style !== "LINK" ? b.customId : undefined)
//         .filter(v => typeof v !== "undefined");

//     for(const id of btIds)
//     {
//         if(!id) continue;

//         btnMsgs.set(id, btnMsg);
//     }

//     btnMsg.opts.timeout > -1 && setTimeout(() => {
//         btnMsg.emit("timeout");
//         btnMsg.destroy();
//     }, btnMsg.opts.timeout);

//     btnMsg.on("destroy", ids => {
//         ids.forEach(id => btnMsgs.delete(id));
//     });
// }

// /**
//  * Deletes a previously registered `BtnMsg` instance
//  * @private
//  */
// export function deleteBtnMsg(btnMsg: BtnMsg)
// {
//     return btnMsgs.delete(btnMsg.id);
// }


//#MARKER modals


/**
 * Registers a `Modal` instance - this is done automatically in its constructor, don't run this function yourself!
 * @private
 */
export function registerModal(modal: Modal)
{
    modals.set(modal.id, modal);

    modal.on("destroy", () => {
        modals.delete(modal.id);
    });
}

/**
 * Runs the submission method of the submitted modal
 */
export async function modalSubmitted(int: ModalSubmitInteraction)
{
    try
    {
        const modal = modals.get(int.customId);

        if(modal)
            await modal.trySubmit(int);
    }
    catch(err)
    {
        const embeds = [ embedify(`Couldn't run this modal due to an error${err instanceof Error ? `: ${err.message}` : "."}`, settings.embedColors.error) ];

        if(typeof int.reply === "function" && !int.replied && !int.deferred)
            return await int.reply({ embeds, ephemeral: true });

        if(typeof int.editReply === "function" && (int.deferred || int.replied))
            return await int.editReply({ embeds });
    }
}
