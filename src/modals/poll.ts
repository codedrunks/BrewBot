import { EmbedBuilder, EmbedField, Message, MessageOptions, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

import { Modal } from "@utils/Modal";
import { settings } from "@src/settings";
import { embedify, zeroPad } from "@src/utils";
import { createNewGuild, createNewPoll, getGuild, getPolls } from "@src/database/guild";
import { halves } from "svcorelib";

interface PollModalData {
    topic: string | null;
    expiry: string;
    voteOptions: string[];
}

export interface CreatePollModal {
    /** Emitted on error and unhandled Promise rejection */
    on(event: "error", listener: (err: Error) => void): this;
    /** Gets emitted when this modal has finished submitting and needs to be deleted from the registry */
    on(event: "destroy", listener: (btnIds: string[]) => void): this;
    /** Emitted when the user submits the modal but it is invalid */
    on(evt: "invalid", listener: (modalData: PollModalData, pollId: string) => void): this;
    /** Emitted when the cached modal data should be deleted */
    on(evt: "deleteCachedData", listener: () => void): this;
}

export class CreatePollModal extends Modal
{
    private headline;
    private votesPerUser;
    private title;

    constructor(headline?: string, votesPerUser = 1, title?: string, modalData?: PollModalData)
    {
        const p = zeroPad, d = new Date();
        const defaultExpiry = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;

        super({
            title: "Create a poll",
            inputs: [
                new TextInputBuilder()
                    .setCustomId("topic")
                    .setLabel("Topic of the poll")
                    .setPlaceholder("The topic of the poll.\nLeave empty if you sent your own message.\nSupports Discord's Markdown.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(250)
                    .setRequired(false)
                    .setValue(modalData?.topic ?? ""),
                new TextInputBuilder()
                    .setCustomId("expiry_date_time")
                    .setLabel("Poll end date and time (24h, UTC)")
                    .setPlaceholder("YYYY-MM-DD hh:mm  (for today, remove date)")
                    .setMinLength(5)
                    .setMaxLength(16)
                    .setStyle(TextInputStyle.Short)
                    .setValue(defaultExpiry)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId("vote_options")
                    .setLabel("Vote options")
                    // TODO: support custom emojis
                    .setPlaceholder(`The options the users can choose.\nOne option per line, ${settings.emojiList.length} max.\nSupports Discord's Markdown.`)
                    .setMaxLength(Math.min(settings.emojiList.length * 50, 5000))
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setValue(modalData?.voteOptions.join("\n") ?? ""),
            ],
        });

        this.headline = headline;
        this.votesPerUser = votesPerUser;
        this.title = title;
    }

    public static reduceOptionFields(opts: string[]): EmbedField[]
    {
        const optHalves = opts.length > settings.emojiList.length / 3 ? halves(opts) : [opts];

        const redOpts: { opt: string, emoji: string }[][] = [];

        optHalves.forEach((half, i) =>
            redOpts.push(half.map((opt, j) =>
                ({ opt, emoji: settings.emojiList[j + (i === 1 ? optHalves[0].length : 0)] })
            ))
        );

        return redOpts.map((red, i) => ({
            name: i === 0 ? "**Options:**" : "\u200B",
            value: red.reduce((a, c) => `${a}\n${c.emoji} \u200B ${c.opt}`, ""),
            inline: true,
        }));
    }

    async submit(int: ModalSubmitInteraction<"cached">): Promise<void> {
        const { guild, channel } = int;

        if(!guild || !channel)
            return; // already handled in the poll command

        const topicRaw = int.fields.getTextInputValue("topic").trim();

        const topic = topicRaw.length === 0 ? undefined : topicRaw;
        const expiry = int.fields.getTextInputValue("expiry_date_time").trim();
        const voteOptions = int.fields.getTextInputValue("vote_options").trim().split(/\n/gm).filter(v => v.length > 0);
        const headline = this.headline;

        const longFmtRe = /^\d{4}[/-]\d{1,2}[/-]\d{1,2}[\s.,_T]\d{1,2}:\d{1,2}(:\d{1,2})?$/,
            shortFmtRe = /^\d{1,2}:\d{1,2}$/;

        const modalInvalid = (msg: string) => {
            this.emit("invalid", { topic: topic ?? null, expiry, voteOptions });
            return this.reply(int, embedify(msg, settings.embedColors.error), true);
        };

        if(!expiry.match(longFmtRe) && !expiry.match(shortFmtRe))
            return modalInvalid("Please make sure the poll end date and time are formatted in one of these formats (24 hours, in UTC / GMT+0 time):\n- `YYYY/MM/DD hh:mm`\n- `hh:mm` (today)");
        if(voteOptions.length > settings.emojiList.length)
            return modalInvalid(`Please enter ${settings.emojiList.length} vote options at most.`);
        if(voteOptions.length < 2)
            return modalInvalid("Please enter at least two options to vote on.");

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, ...rest] = (expiry.match(longFmtRe)
            ? /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[\s.,_T](\d{1,2}):(\d{1,2}):?(\d{1,2})?$/.exec(expiry)
            : /^(\d{1,2}):(\d{1,2})$/.exec(expiry)
        )?.filter(v => v) as string[];

        // TODO:FIXME: this shit is utterly broken
        const d = new Date();
        let dateParts: number[] = [];

        if(rest.length === 5)
            dateParts = rest.map(v => parseInt(v));
        else
            dateParts = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), ...rest.map(v => parseInt(v))];

        // parseInt(v) - new Date().getTimezoneOffset() / 60
            
        const dueTimestamp = new Date(...<[number]>dateParts);
        const optionFields = CreatePollModal.reduceOptionFields(voteOptions);

        const dueTs = dueTimestamp.getTime();
        const nowTs = new Date().getTime() + 30_000;

        const due = new Date(dueTs), now = new Date(nowTs);

        if(dueTs < nowTs)
            return modalInvalid("Please enter a date and time that is at least one minute from now.");

        const ebd = new EmbedBuilder()
            .setTitle(this.title ?? "Poll")
            .addFields(optionFields)
            .setFooter({ text: `Click the reaction emojis below to cast ${this.votesPerUser === 1 ? "a vote" : "votes"}.` })
            .setColor(settings.embedColors.default);

        topic && topic.length > 0 && ebd.setDescription(`> **Topic:**${topic.length > 64 ? "\n>" : ""} ${topic}\n`);

        this.emit("deleteCachedData");

        await this.deferReply(int, true);

        console.log();

        // send messages & react
        try
        {
            const voteOpts = voteOptions.map((value, i) => ({ emoji: settings.emojiList[i], value }));
            const voteRows: Record<"emoji" | "value", string>[][] = [];

            while(voteOpts.length > 0)
                voteRows.push(voteOpts.splice(0, 10));

            const msgs: Message[] = [];

            const firstMsgOpts: MessageOptions = {};
            if(headline)
                firstMsgOpts.content = headline;
            msgs.push(await channel.send({ ...firstMsgOpts, embeds: [ebd] }));

            for await(const { emoji } of voteRows.shift()!)
                await msgs[0].react(emoji);

            let i = 1;
            for(const row of voteRows)
            {
                channel.send({ content: "\u200B" }).then(async msg => {
                    msgs.push(msg);
                    for await(const { emoji } of row)
                        await msgs[i].react(emoji);
                    i++;
                });
            }

            const dbGld = await getGuild(guild.id);

            if(!dbGld)
                await createNewGuild(guild.id);

            const allPolls = await getPolls(guild.id);

            let pollId = 1;
            if(allPolls && allPolls.length)
            {
                allPolls.forEach(p => {
                    if(p.pollId >= pollId)
                        pollId = p.pollId + 1;
                });
            }

            await createNewPoll({
                pollId,
                guildId: guild.id,
                channel: channel.id,
                messages: msgs.map(m => m.id),
                createdBy: int.user.id,
                headline: headline ?? null,
                topic: topic && topic.length > 0 ? topic : null,
                voteOptions,
                votesPerUser: this.votesPerUser,
                dueTimestamp,
            });

            return this.editReply(int, embedify("Successfully created a poll in this channel."));
        }
        catch(err)
        {
            return this.editReply(int, embedify(`Couldn't create a poll due to an error: ${err}`, settings.embedColors.error));
        }
    }
}
