import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { ButtonInteraction, Client, Collection, ModalSubmitInteraction } from "discord.js";

import { Command } from "./Command";
import { Event } from "./Event";
import { commands } from "./commands";
import { events } from "./events";
import { BtnMsg } from "./BtnMsg";
import { Modal } from "./Modal";


let rest: REST;
let botClient: Client;

/** Array of all registered Command instances */
const cmds: Command[] = [];
/** Array of all registered Event instances */
const evts: Event[] = [];
/** Map of all registered BtnMsg instances */
const btnMsgs = new Collection<string, BtnMsg>();
/** Map of all registered Modal instances */
const modals = new Collection<string, Modal>();


export function initRegistry(client: Client)
{
    botClient = client;

    rest = new REST({
        version: "10"
    }).setToken(process.env.BOT_TOKEN ?? "ERR_NO_ENV");
}


//#MARKER commands


export function getCommands()
{
    return cmds;
}

/** Registers all slash commands for the specified guild or guilds */
export async function registerGuildCommands(guildID: string[]): Promise<void>
export async function registerGuildCommands(guildID: string): Promise<void>
export async function registerGuildCommands(...guildIDs: (string|string[])[]): Promise<void>
{
    if(!botClient)
        throw new Error("Registry isn't initialized yet!");

    const gid = guildIDs[0];
    const guilds = Array.isArray(gid) ? gid : [gid];

    try
    {
        commands.forEach(CmdClass => !cmds.find(c => c.constructor.name === CmdClass.constructor.name) && cmds.push(new CmdClass(botClient as Client)));
    }
    catch(err)
    {
        console.error(err);
        process.exit(1);
    }

    const slashCmds = cmds.filter(c => c.enabled).map(c => c.getSlashCmdJson());


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
    if(!botClient)
        throw new Error("Registry isn't initialized yet!");

    events.forEach(EvtClass => evts.push(new EvtClass()));

    // listen for events

    for(const ev of evts)
    {
        if(!ev.enabled) continue;

        for(const evName of ev.names)
            botClient.on(evName, async (...args) => void await ev.run(...args));
    }

    return evts;
}


//#MARKER buttons


export function getBtnMsgs()
{
    return btnMsgs;
}

/**
 * Registers a `BtnMsg` instance - this is done automatically in its constructor, don't run this function yourself!
 * @private
 */
export function registerBtnMsg(btnMsg: BtnMsg)
{
    const btIds = btnMsg.btns
        .map(b => b.style !== "LINK" ? b.customId : undefined)
        .filter(v => typeof v !== "undefined");

    for(const id of btIds)
    {
        if(!id) continue;

        btnMsgs.set(id, btnMsg);
    }

    btnMsg.opts.timeout > -1 && setTimeout(() => {
        btnMsg.emit("timeout");
        btnMsg.destroy();
    }, btnMsg.opts.timeout);

    btnMsg.on("destroy", ids => {
        ids.forEach(id => btnMsgs.delete(id));
    });
}

/**
 * Deletes a previously registered `BtnMsg` instance
 * @private
 */
export function deleteBtnMsg(btnMsg: BtnMsg)
{
    return btnMsgs.delete(btnMsg.id);
}

export async function btnPressed(int: ButtonInteraction)
{
    const bm = btnMsgs.get(int.customId);
    const idx = parseInt(String(int.customId.split("@").at(-1)));

    if(bm && !isNaN(idx))
    {
        const btn = bm.btns.find(b => b.customId?.endsWith(String(idx)));
        btn && bm.emit("press", btn, int);
    }
}


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
    const modal = modals.get(int.customId);

    if(modal)
    {
        await modal.trySubmit(int);
    }
}
