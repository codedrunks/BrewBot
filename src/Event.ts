import { ClientEvents } from "discord.js";


export type EventName = keyof ClientEvents;

/** Base class for all bot events */
export abstract class Event {
    readonly names: EventName[];

    /** Base class for all bot events */
    constructor(names: EventName | EventName[])
    {
        this.names = Array.isArray(names) ? names : [names];
    }

    public abstract run(...args: unknown[]): Promise<unknown>;
}
