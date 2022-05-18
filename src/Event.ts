import { EventName } from "./types";

/** Base class for all client events */
export abstract class Event {
    readonly names: EventName[];
    /** Set to false to disable this event */
    public enabled = true;

    /** Base class for all client events. Can listen for one or multiple events at once. */
    constructor(names: EventName | EventName[])
    {
        this.names = Array.isArray(names) ? names : [names];
    }

    /**
     * Gets called whenever this event is triggered
     * @abstract This method needs to be overridden in a sub-class
     */
    public abstract run(...args: unknown[]): Promise<unknown>;
}
