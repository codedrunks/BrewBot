import { ColorResolvable, EmbedBuilder, Message, TextBasedChannel } from "discord.js";
import { EmitterBase } from "./EmitterBase";
import { settings } from "@src/settings";

interface SelectionMsgSettings {
    /** Embed title */
    title: string;
    /** Embed color */
    color?: ColorResolvable;
    /** Embed footer */
    footer?: string;
    /**
     * Set this to `0` to enable everyone to use the buttons.  
     * Set to a positive number to wait for this timeout in ms until allowing others to use the buttons.  
     * Default is `-1` (only author can use them)
     */
    allowAllUsersTimeout?: number;
}

export interface SelectionMsg {
    /** Emitted on error and unhandled Promise rejection */
    on(event: "error", listener: (err: Error) => void): this;
    /** Gets emitted when this SelectionMsg has finished and is about to deregister its buttons */
    on(event: "destroy", listener: () => void): this;
}

export class SelectionMsg extends EmitterBase {
    private options;
    private settings;

    private msg: Message | undefined;

    /**
     * Constructs a new SelectionMsg, which lists options a user can choose from by pressing attached buttons
     * @param options Can contain markdown - max amount is 25
     */
    constructor(options: string[], settings: SelectionMsgSettings) {
        super();

        if(options.length > 25)
            throw new TypeError("SelectionMsg options can't have more than 25 items");

        this.options = options;
        this.settings = settings;
    }

    private reduceOpts(options = this.options, offset = 0) {
        return options.reduce((a, c, i) => a += `${i > 0 ? "\n" : ""}\`${i + 1 + offset}\` - ${c}`, "");
    }

    public getMsgProps() {
        const ebd = new EmbedBuilder()
            .setTitle(this.settings.title)
            .setColor(this.settings.color ?? settings.embedColors.default)
            .setFooter({ text: this.settings.footer ?? "Please click a button below to choose" });

        if(this.options.length > 5) {
            const opts = [...this.options];
            const first = opts.splice(0, Math.ceil(opts.length / 2));
            ebd.setFields([
                {
                    name: "\u200B",
                    value: this.reduceOpts(first),
                    inline: true,
                },
                {
                    name: "\u200B",
                    value: this.reduceOpts(opts, first.length),
                    inline: true,
                },
            ]);
        }
        else
            ebd.setDescription(this.reduceOpts());

        return {
            embeds: [ ebd ],
            components: [],
        };
    }

    public sendIn(channel: TextBasedChannel) {
        const msg = channel.send(this.getMsgProps());
        msg.then((msg) => this.msg = msg);
        return msg;
    }
}
