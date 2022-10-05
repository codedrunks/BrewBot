import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { ButtonInteraction, Client, Collection, ButtonBuilder, ModalSubmitInteraction, APIButtonComponentWithCustomId, ButtonStyle } from "discord.js";

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
import { unused } from "svcorelib";
// import { PutGuildCommandResult } from "./types";


const rest = new REST({ version: "10" })
    .setToken(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

let client: Client;

/** Array of all registered Command instances */
const cmds: Command[] = [];
/** Array of all registered CtxMenu instances */
const ctxMenus: CtxMenu[] = [];
/** Array of all registered Event instances */
const evts: Event[] = [];
/** Collection of all registered Modal instances */
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

/** Registers all slash commands and context menus for multiple guilds */
export async function registerGuildCommands(guildID: string[]): Promise<void>
/** Registers all slash commands and context menus for one guild */
export async function registerGuildCommands(guildID: string): Promise<void>
export async function registerGuildCommands(...guildIDs: (string|string[])[]): Promise<void>
{
    if(!client)
        throw new Error("Registry isn't initialized yet!");

    const gid = guildIDs[0];
    const guilds = Array.isArray(gid) ? gid : [gid];

    try
    {
        if(cmds.length === 0)
            for(const CmdClass of commands)
                !cmds.find(c => c.constructor.name === CmdClass.constructor.name) && cmds.push(new CmdClass(client));
    }
    catch(err)
    {
        console.error("Error while registering guild commands:", err);
        process.exit(1);
    }

    try
    {
        if(ctxMenus.length === 0)
            for(const CtxClass of contextMenus)
                ctxMenus.push(new CtxClass());
    }
    catch(err)
    {
        console.error("Error while registering context menu commands:", err);
        process.exit(1);
    }

    const slashCmds = cmds
        .filter(c => c.enabled)
        .map(c => c.slashCmdJson)
        .concat(ctxMenus
            .filter(ctx => ctx.enabled)
            .map(c => c.ctxMenuJson)
        );

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

        const restRes = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID ?? "ERR_NO_ENV", guild), {
                body: slashCmds
            },
        );

        unused(restRes);

        // #DEBUG use this to get a command's ID
        // if(guild === "693878197107949572")
        // {
        //     const cmd = (restRes as Record<string, string>[]).find(cmd => cmd.name === "ferret") as undefined | PutGuildCommandResult;
        //     console.log(cmd);
        // }
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
    on(event: "press", listener: (int: ButtonInteraction, btn: ButtonBuilder) => void): this;
}

// TODO:FIXME: I'm pretty sure this causes memory leaks if the events aren't cleaned up -sv
class BtnListener extends EventEmitter
{
    private btns = new Collection<string, ButtonBuilder>();

    constructor()
    {
        super({ captureRejections: true });
    }

    /** Adds multiple ButtonBuilders. Throws an error if there's no customId props! */
    public addBtns(btns: ButtonBuilder[]): void
    /** Adds one ButtonBuilder. Throws an error if there's no customId prop! */
    public addBtns(btn: ButtonBuilder): void
    public addBtns(btns: ButtonBuilder | ButtonBuilder[]): void
    {
        btns = Array.isArray(btns) ? btns : [btns];

        btns.forEach(bt => {
            if(!(bt.data as Partial<APIButtonComponentWithCustomId>).custom_id)
                throw new TypeError(`ButtonBuilder "${bt.data.label}/${ButtonStyle[bt.data.style as unknown as ButtonStyle]}" doesn't have a customId`);
            this.btns.set((bt.data as APIButtonComponentWithCustomId).custom_id, bt);
        });
    }

    /** Deletes multiple ButtonBuilders by their customId's. Invalid IDs are ignored. */
    public delBtns(customIDs?: (string | null)[]): void
    /** Deletes one  ButtonBuilder by its customId. Invalid ID is ignored. */
    public delBtns(customId?: string): void
    public delBtns(customIDs?: string | (string | null)[]): void
    {
        const ids = Array.isArray(customIDs) ? customIDs : [customIDs];

        ids.forEach(id => id && this.btns.delete(id));
    }

    /** Returns all buttons that are currently registered, as a Collection of customId and ButtonBuilder instances */
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

/** This instance manages all ButtonBuilders and emits events when they are clicked. */
export const btnListener = new BtnListener();


//#MARKER modals


/**
 * Registers a `Modal` instance - this is done automatically in its constructor, don't run this function yourself!
 * @private
 */
export function registerModal(modal: Modal)
{
    modals.set(modal.id, modal);

    modal.once("destroy", () => {
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
