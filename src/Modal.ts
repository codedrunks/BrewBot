import EventEmitter from "events";
import { MessageActionRow, TextInputComponent, Modal as DjsModal, ModalSubmitInteraction, MessageEmbed, MessageButton } from "discord.js";
import { randomUUID } from "crypto";
import { registerModal } from "@src/registry";
import { Command } from "@src/Command";

interface ModalConstructor {
    title: string;
    inputs: TextInputComponent[];
}

export interface Modal {
    /** Gets emitted when this modal has finished submitting and needs to be deleted from the registry */
    on(event: "destroy", listener: (btnIds: string[]) => void): this;
}

/** Base class for all Modals */
export abstract class Modal extends EventEmitter {
    readonly id: string = randomUUID({ disableEntropyCache: true });
    private readonly internalModal: DjsModal;

    /** Base class for all Modals */
    constructor(data: ModalConstructor) {
        super();

        this.internalModal = new DjsModal()
            .setCustomId(this.id)
            .setTitle(data.title);

        const components = new Array(data.inputs.length).fill(null).map((_, i) => {
            return new MessageActionRow<TextInputComponent>().addComponents(data.inputs[i]);
        });

        this.internalModal.addComponents(...components);

        registerModal(this);
    }

    /** Removes all listeners and triggers the registry to delete its reference to this instance */
    public destroy()
    {
        this.emit("destroy");
        this.removeAllListeners("destroy");
    }

    /** Called when a user tries to submit this modal */
    async trySubmit(int: ModalSubmitInteraction) {
        this.submit(int);
        this.destroy();
    }

    /**
     * Replies to a ModalSubmitInteraction.  
     * Has to be called within 3 seconds, otherwise the reply times out. Alternatively, use `deferReply()` and `editReply()` for 15 minutes.
     * @param int The ModalSubmitInteraction to reply to
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param ephemeral Set to true to make the reply only visible to the author. Defaults to false (publicly visible).
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async reply(int: ModalSubmitInteraction, content: string | MessageEmbed | MessageEmbed[], ephemeral = false, actions?: MessageButton | MessageButton[])
    {
        if(typeof content === "string")
            await int.reply({ content, ephemeral, ...Command.useButtons(actions) });
        else if(content instanceof MessageEmbed || content instanceof Array<MessageEmbed>)
            await int.reply({ embeds: Array.isArray(content) ? content : [content], ephemeral, ...Command.useButtons(actions) });
    }

    /**
     * Defers a ModalSubmitInteraction and displays a "bot is thinking..." message, so it can be responded to after a maximum of 15 minutes
     * @param int The ModalSubmitInteraction to reply to
     * @param ephemeral Set to true to make both the "bot is thinking..." message and reply only visible to the author. Defaults to false (publicly visible).
     */
    protected async deferReply(int: ModalSubmitInteraction, ephemeral = false)
    {
        return await int.deferReply({ ephemeral });
    }

    /**
     * Edits the reply of a ModalSubmitInteraction or sends a new reply when used after `deferReply()`
     * @param int The ModalSubmitInteraction to edit the reply of
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async editReply(int: ModalSubmitInteraction, content: string | MessageEmbed | MessageEmbed[], actions?: MessageButton | MessageButton[])
    {
        if(typeof content === "string")
            await int.editReply({ content, ...Command.useButtons(actions) });
        else if(content instanceof MessageEmbed || content instanceof Array<MessageEmbed>)
            await int.editReply({ embeds: Array.isArray(content) ? content : [content], ...Command.useButtons(actions) });
    }

    /**
     * Follows up a reply with a new reply
     * @param int The ModalSubmitInteraction to follow up
     * @param content Can be a string or a single or multiple MessageEmbed instances
     * @param ephemeral Set to true to make the follow up only visible to the author. Defaults to false (publicly visible)
     * @param actions An action or an array of actions to attach to the reply
     */
    protected async followUpReply(int: ModalSubmitInteraction, content: string | MessageEmbed | MessageEmbed[], ephemeral = false, actions?: MessageButton | MessageButton[])
    {
        if(typeof content === "string")
            await int.followUp({ content, ephemeral, ...Command.useButtons(actions) });
        else if(content instanceof MessageEmbed || content instanceof Array<MessageEmbed>)
            await int.followUp({ embeds: Array.isArray(content) ? content : [content], ephemeral, ...Command.useButtons(actions) });
    }

    /** Deletes the reply of a ModalSubmitInteraction */
    protected async deleteReply(int: ModalSubmitInteraction)
    {
        int.replied && await int.deleteReply();
    }

    /**
     * This method is called whenever this modal is submitted by a user
     * @abstract This method needs to be overridden in a sub-class
     */
    protected abstract submit(int: ModalSubmitInteraction): Promise<void>;

    /**
     * This method returns the internal discord.js Modal to be used in interaction.showModal()
     */
    public getInternalModal(): DjsModal {
        return this.internalModal;
    }
}
