import { embedify } from "../util";
import { ModalSubmitInteraction, CacheType, TextInputComponent } from "discord.js";
import { Modal } from "../Modal";

export class ContestModal extends Modal {
    /** Date format is: "YYYY-MM-DD HH:MM" */
    private readonly contestDateRegex = /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;

    constructor() {
        super({
            title: "Add New Contest",
            inputs: [
                new TextInputComponent()
                    .setCustomId("name")
                    .setLabel("Contest Name")
                    .setStyle("SHORT")
                    .setMaxLength(100)
                    .setRequired(true),
                new TextInputComponent()
                    .setCustomId("desc")
                    .setLabel("Contest Description")
                    .setStyle("PARAGRAPH")
                    .setMaxLength(1500)
                    .setRequired(true),
                new TextInputComponent()
                    .setCustomId("start_date")
                    .setLabel("Start Date and Time (UTC | YYYY-MM-DD HH:MM)")
                    .setStyle("SHORT")
                    .setPlaceholder("2022-10-29 13:45")
                    .setMaxLength(50)
                    .setRequired(true),
                new TextInputComponent()
                    .setCustomId("end_date")
                    .setLabel("End Date and Time (UTC | YYYY-MM-DD HH:MM)")
                    .setStyle("SHORT")
                    .setPlaceholder("2022-10-29 13:45")
                    .setMaxLength(50)
                    .setRequired(true)
            ]
        });
    }

    async submit(int: ModalSubmitInteraction<CacheType>): Promise<void> {
        const name = int.fields.getTextInputValue("name").trim();
        const desc = int.fields.getTextInputValue("desc").trim();
        const startDate = int.fields.getTextInputValue("start_date").trim();
        const endDate = int.fields.getTextInputValue("end_date").trim();

        if (!this.contestDateRegex.test(startDate) || !this.contestDateRegex.test(endDate)) {
            return await this.reply(int, embedify("Invalid start or end date format. please try again"));
        }

        // TODO: check if start date is after end date
        // TODO: only allow dates to be 6 months apart at most
        // TODO: check if start date is in the past
        //
        // TODO: input validation ??
        //
        // TODO: parse date into an actual date object

        // TODO: write to database. make replies ephemeral ??

        return await this.reply(int, embedify("placeholder"));
    }
}
