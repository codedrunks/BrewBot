import { EmbedBuilder, Message, MessageOptions, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

import { Modal } from "@utils/Modal";
import { settings } from "@src/settings";
import { embedify } from "@src/utils";

export class CreatePollModal extends Modal
{
    private ephemeral;
    private headline;

    constructor(ephemeral: boolean, headline?: string)
    {
        super({
            title: "Create a poll",
            inputs: [
                new TextInputBuilder()
                    .setCustomId("topic")
                    .setLabel("Topic of the poll")
                    .setPlaceholder("The topic you want the users to vote on.\nSupports Discord's Markdown.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId("expiry_date_time")
                    .setLabel("Poll end date and time")
                    .setPlaceholder("The end date and time of the poll in the format YYYY/MM/DD hh:mm:ss UTC")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId("vote_options")
                    .setLabel("Vote options")
                    .setPlaceholder(`The options the users can choose.\n- One option per line, ${settings.emojiList.length} max.\nSupports Discord's Markdown.`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true),
            ],
        });

        this.ephemeral = ephemeral;
        this.headline = headline;
    }

    async submit(int: ModalSubmitInteraction<"cached">): Promise<void> {
        const { guild, channel } = int;

        if(!guild || !channel)
            return this.reply(int, embedify("Please use this command in a server.", settings.embedColors.error), true);

        const topic = int.fields.getTextInputValue("topic").trim();
        const expiry = int.fields.getTextInputValue("expiry_date_time").trim();
        const voteOptions = int.fields.getTextInputValue("vote_options").trim().split(/\n/gm).filter(v => v.length > 0);
        const headline = this.headline;

        if(!expiry.match(/^\s*(\d{4}\/\d{2}\/\d{2})[\s.,_](\d{2}:\d{2}:\d{2})\s*$/))
            return this.reply(int, embedify("Please enter a topic that the users should vote on.", settings.embedColors.error), true);
        if(voteOptions.length > settings.emojiList.length)
            return this.reply(int, embedify(`Please enter ${settings.emojiList.length} vote options at most.`, settings.embedColors.error), true);

        const descOptions = voteOptions.reduce((a, c, i) => `${a}\n${settings.emojiList[i]} - ${c}`, "");

        const ebd = new EmbedBuilder()
            .setTitle("Poll")
            .setDescription(`This poll was created to vote about:\n\`\`\`\n${topic}\`\`\`\n\nYour options are:${descOptions}`)
            .setFields()
            .setColor(settings.embedColors.default);

        await this.deferReply(int, true);

        // send messages & react
        const voteOpts = voteOptions.map((value, i) => ({ emoji: settings.emojiList[i], value }));
        const voteRows: Record<"emoji" | "value", string>[][] = [];

        while(voteOptions.length > 0)
            voteRows.push(voteOpts.splice(0, 10));

        const msgs: Message[] = [];

        const firstMsgOpts: MessageOptions = {};
        if(headline)
            firstMsgOpts.content = headline;
        msgs.push(await channel.send({ ...firstMsgOpts, embeds: [ebd] }));

        for await(const { emoji } of voteRows[0])
            await msgs[0].react(emoji);

        let i = 1;
        for await(const row of voteRows)
        {
            msgs.push(await channel.send({ content: "\u200B" }));
            for await(const { emoji } of row)
                await msgs[i].react(emoji);
            i++;
        }

        // TODO: collectors

        return this.editReply(int, embedify("Successfully started a poll in this channel."));
    }
}
