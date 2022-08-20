import EventEmitter from "events";

/** Base class for event emitting classes. Has destroy methods to clean up event listeners. Has the events "destroy" and "error" for uncaught Promise rejections. */
export abstract class EmitterBase extends EventEmitter
{
    protected destroyed = false;

    constructor()
    {
        super({ captureRejections: true });
    }

    /** Destroys this instance by calling _destroy() - can be overridden for custom behavior. */
    public destroy()
    {
        this._destroy();
    }

    /** This method emits the "destroy" event once and then removes all listeners */
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
