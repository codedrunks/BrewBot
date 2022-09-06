import { EmbedBuilder, EmbedField, Message, MessageOptions, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

import { Modal } from "@utils/Modal";
import { settings } from "@src/settings";
import { embedify } from "@src/utils";
import { createNewGuild, createNewPoll, getGuild, getPolls } from "@src/database/guild";
import { halves } from "svcorelib";

export class CreatePollModal extends Modal
{
    private headline;
    private votesPerUser;

    constructor(headline?: string, votesPerUser = 1)
    {
        // TODO: persist initial value of modal inputs with redis so the data is kept when a user fucks up the time
        super({
            title: "Create a poll",
            inputs: [
                new TextInputBuilder()
                    .setCustomId("topic")
                    .setLabel("Topic of the poll")
                    .setPlaceholder("The topic of the poll.\nLeave empty if you sent your own message.\nSupports Discord's Markdown.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(250)
                    .setRequired(false),
                new TextInputBuilder()
                    .setCustomId("expiry_date_time")
                    .setLabel("Poll end date and time")
                    .setPlaceholder("YYYY-MM-DD hh:mm  (24h, UTC, for today remove date)")
                    .setMinLength(3)
                    .setMaxLength(16)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId("vote_options")
                    .setLabel("Vote options")
                    .setPlaceholder(`The options the users can choose.\nOne option per line, ${settings.emojiList.length} max.\nSupports Discord's Markdown.`)
                    .setMaxLength(Math.min(settings.emojiList.length * 50, 5000))
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true),
            ],
        });

        this.headline = headline;
        this.votesPerUser = votesPerUser;
    }

    public static reduceOptionFields(opts: string[], twoFields = true): EmbedField[]
    {
        // TODO: Fix
        return (twoFields ? halves(opts) : [opts])
            .reduce((a, o, i) => {
                a.push(o.map(opt => ({ opt, emoji: settings.emojiList[i] })) as never);
                return a;
            }, [])
            .map(() => ({
                name: "\u200B",
                value: opts.reduce((a, c, i) => `${a}\n${c.emoji} \u200B ${c.opt}`, ""),
                inline: true,
            }));
    }

    async submit(int: ModalSubmitInteraction<"cached">): Promise<void> {
        const { guild, channel } = int;

        if(!guild || !channel)
            return; // already handled in the poll command

        const topic = int.fields.getTextInputValue("topic").trim();
        const expiry = int.fields.getTextInputValue("expiry_date_time").trim();
        const voteOptions = int.fields.getTextInputValue("vote_options").trim().split(/\n/gm).filter(v => v.length > 0);
        const headline = this.headline;

        const longFmtRe = /^\d{4}[/-]\d{1,2}[/-]\d{1,2}[\s.,_T]\d{1,2}:\d{1,2}(:\d{1,2})?$/,
            shortFmtRe = /^\d{1,2}:\d{1,2}(:\d{1,2})?$/;

        if(!expiry.match(longFmtRe) && !expiry.match(shortFmtRe))
            return this.reply(int, embedify("Please make sure the poll end date and time are formatted in one of these formats (24 hours, in UTC / GMT+0 time):\n- `YYYY/MM/DD hh:mm`\n- `hh:mm` (today)", settings.embedColors.error), true);
        if(voteOptions.length > settings.emojiList.length)
            return this.reply(int, embedify(`Please enter ${settings.emojiList.length} vote options at most.`, settings.embedColors.error), true);
        if(voteOptions.length < 2)
            return this.reply(int, embedify("Please enter at least two options to vote on.", settings.embedColors.error), true);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, ...rest] = (expiry.match(longFmtRe)
            ? /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[\s.,_T](\d{1,2}):(\d{1,2}):?(\d{1,2})?$/.exec(expiry)
            : /^(\d{1,2}):(\d{1,2}):?(\d{1,2})?$/.exec(expiry)
        )?.filter(v => v) as string[];

        const d = new Date(),
            today = rest.length > 4 ? [] : [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];

        const timeParts = [...today, ...rest.map((v, i) => i != 0 ? parseInt(v) : parseInt(v) - new Date().getTimezoneOffset() / 60)] as [number];

        const dueTimestamp = new Date(...timeParts);
        const optionFields = CreatePollModal.reduceOptionFields(voteOptions);

        if(dueTimestamp.getTime() < Date.now() + 1000 * 30)
            return this.reply(int, embedify("Please enter a date and time that is at least one minute from now.", settings.embedColors.error), true);

        const ebd = new EmbedBuilder()
            .setTitle("Poll")
            .addFields(optionFields)
            .setFooter({ text: "Click the reaction emojis under this message to cast a vote." })
            .setColor(settings.embedColors.default);

        topic.length > 0 && ebd.setDescription(`**Topic of the vote:**\n> ${topic}\n\n**Your options are:**\n`);

        await this.deferReply(int, true);

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
                topic: topic.length > 0 ? topic : null,
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
