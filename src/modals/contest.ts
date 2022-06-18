import { embedify } from "../util";
import { ModalSubmitInteraction, CacheType, TextInputComponent } from "discord.js";
import { Modal } from "../Modal";
import { addContest } from "../database/contest";
import { DatabaseError } from "../database/util";

export class ContestModal extends Modal {
    /** Date format is: "YYYY-MM-DD HH:MM" */
    private readonly contestDateRegex = /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
    private readonly SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;

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
                    .setLabel("Start Datetime (YYYY-MM-DD HH:MM) (Local TZ)")
                    .setStyle("SHORT")
                    .setPlaceholder("2022-10-29 13:45")
                    .setMaxLength(50)
                    .setRequired(true),
                new TextInputComponent()
                    .setCustomId("end_date")
                    .setLabel("End Datetime (YYYY-MM-DD HH:MM) (Local TZ)")
                    .setStyle("SHORT")
                    .setPlaceholder("2022-10-29 13:45")
                    .setMaxLength(50)
                    .setRequired(true)
            ]
        });
    }

    async submit(int: ModalSubmitInteraction<CacheType>): Promise<void> {
        if (!int.guild?.id) return await this.reply(int, embedify("Cannot submit a modal when not in guild"));

        const name = int.fields.getTextInputValue("name").trim();
        const desc = int.fields.getTextInputValue("desc").trim();
        const startDate = int.fields.getTextInputValue("start_date").trim();
        const endDate = int.fields.getTextInputValue("end_date").trim();

        if (!this.contestDateRegex.test(startDate) || !this.contestDateRegex.test(endDate)) {
            return await this.reply(int, embedify("Invalid start or end date format. please try again"));
        }

        const startDateTimestamp = Date.parse(startDate);
        const endDateTimestamp = Date.parse(endDate);

        const now = new Date().getTime();

        if (startDateTimestamp < now) {
            return await this.reply(int, embedify("Start date cannot be in the past"));
        }

        if (startDateTimestamp - now >= this.SIX_MONTHS) {
            return await this.reply(int, embedify("Start date cannot more than 6 months in the future"));
        }

        if (startDateTimestamp >= endDateTimestamp) {
            return await this.reply(int, embedify("Start date cannot be after or equal to end date"));
        }

        if (endDateTimestamp - startDateTimestamp >= this.SIX_MONTHS) {
            return await this.reply(int, embedify("Dates cannot be more than 6 months apart"));
        }

        const startDateISO = new Date(startDateTimestamp).toISOString();
        const endDateISO = new Date(endDateTimestamp).toISOString();

        const err = await addContest(int.guild.id, name, desc, startDateISO, endDateISO);

        if (err == DatabaseError.UNKNOWN)
            return await this.reply(int, embedify("An error has occurred while adding the contest, please try again later"));

        return await this.reply(int, embedify("Successfully added contest!"));
    }
}
