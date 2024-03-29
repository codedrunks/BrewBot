import EventEmitter from "events";

export abstract class EmitterBase extends EventEmitter
{
    protected destroyed = false;

    constructor()
    {
        super({ captureRejections: true });
    }

    /** Destroys this instance, emits the "destroy" event, then removes all event listeners */
    public destroy()
    {
        this._destroy();
    }

    protected _destroy(emitDestroy = true)
    {
        if(this.destroyed)
            return;

        this.destroyed = true;

        emitDestroy && this.emit("destroy");

        this.eventNames()
            .forEach(e => this.removeAllListeners(e));
    }
}
