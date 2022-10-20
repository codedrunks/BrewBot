import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, Client, Collection, CommandInteraction, CommandInteractionOption, EmbedBuilder, Message, PermissionFlagsBits, TextChannel } from "discord.js";
import k from "kleur";
import { Command } from "@src/Command";
import { CreatePollModal } from "@src/modals/poll";
import { autoPlural, BtnMsg, embedify, PageEmbed, toUnix10, truncStr, useEmbedify } from "@src/utils";
import { settings } from "@src/settings";
import { deletePoll, getExpiredPolls, getPolls } from "@src/database/guild";
import { Poll as PollObj } from "@prisma/client";
import { getRedis } from "@src/redis";
import { Tuple } from "@src/types";

const redis = getRedis();

interface PollVote {
    msg: Message;
    emoji: string;
    option: string;
    votes: string[]
}

export class Poll extends Command
{
    private client: Client;

    constructor(client: Client)
    {
        super({
            name: "poll",
            desc: "This command allows you to create reaction-based polls that users can vote on",
            category: "util",
            subcommands: [
                {
                    name: "create",
                    desc: "Creates a poll in this channel",
                    args: [
                        {
                            name: "title",
                            desc: "The title of the poll message. This is different from the topic of the poll.",
                            type: ApplicationCommandOptionType.String,
                        },
                        {
                            name: "headline",
                            desc: "Enter pings (be mindful of who you ping) or extra explanatory text to notify users of this poll.",
                            type: ApplicationCommandOptionType.String,
                        },
                        {
                            name: "votes_per_user",
                            desc: "How many times a user is allowed to vote (1 time by default).",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                        },
                        // TODO:
                        // {
                        //     name: "allow_changing",
                        //     desc: "Set this to False to disallow people to change their mind and choose another option.",
                        //     type: ApplicationCommandOptionType.Boolean,
                        // },
                    ],
                },
                {
                    name: "list",
                    desc: "Lists all polls that are active on this server",
                },
                {
                    name: "delete",
                    desc: "Deletes an active poll",
                    args: [
                        {
                            name: "poll_id",
                            desc: "The numerical ID of the poll to delete. View IDs with /poll list",
                            type: ApplicationCommandOptionType.Number,
                            required: true,
                        },
                    ],
                },
            ],
        });

        this.client = client;
    
        try {
            this.checkPolls();
            setInterval(this.checkPolls, 2000);
        }
        catch(err) {
            console.error(k.red("Error while checking polls:"), err);
        }
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption): Promise<void>
    {
        let action = "";

        try
        {
            const { guild, channel } = int;

            if(!guild || !channel)
                return this.reply(int, embedify("Please use this command in a server.", settings.embedColors.error), true);

            switch(opt.name)
            {
            case "create":
            {
                action = "creating a new poll";

                const headline = int.options.get("headline")?.value as string | undefined;
                const votes_per_user = int.options.get("votes_per_user")?.value as number | undefined;
                const title = int.options.get("title")?.value as string | undefined;

                const redisKey = `poll-modal-data_${guild.id}_${int.user.id}`;

                const modalData = await redis.get(redisKey);
                const modal = new CreatePollModal(headline, votes_per_user, title, modalData ? JSON.parse(modalData) : undefined);

                modal.on("invalid", (data) => redis.set(redisKey, JSON.stringify(data)));
                modal.on("deleteCachedData", () => redis.del(redisKey));
                setTimeout(() => redis.del(redisKey), 1000 * 60 * 5);

                return await int.showModal(modal.getInternalModal());
            }
            case "list":
            {
                action = "listing polls";

                await this.deferReply(int);

                const polls = await getPolls(guild.id);

                if(!polls || polls.length === 0)
                    return this.editReply(int, embedify("Currently no polls are active on this server.\nYou can create a new one with `/poll create`", settings.embedColors.error));

                const pollList = [...polls];
                const pages: EmbedBuilder[] = [];
                const pollsPerPage = 4;
                const totalPages = Math.ceil(polls.length / pollsPerPage);

                while(pollList.length > 0)
                {
                    const pollSlice = pollList.splice(0, pollsPerPage);

                    const ebd = new EmbedBuilder()
                        .setTitle("Active polls")
                        .setDescription(polls.length != 1 ? `Currently there's ${polls.length} active ${autoPlural("poll", polls)}.` : "Currently there's only 1 active poll.")
                        .setColor(settings.embedColors.default)
                        .addFields({
                            name: "\u200B",
                            value: pollSlice.reduce((a, c) => ([
                                `${a}\n`,
                                `> **\`${c.pollId}\`** - by <@${c.createdBy}>${c.topic ? "" : ` in <#${c.channel}>`} - [show <:open_in_browser:994648843331309589>](https://discord.com/channels/${c.guildId}/${c.channel}/${c.messages[0]})`,
                                ...(c.topic ? [`> **Topic:** ${truncStr(c.topic.replace(/[`]{3}\w*/gm, "").replace(/\n+/gm, " "), 80)}`] : ["> (no topic)"]),
                                `> Ends <t:${toUnix10(c.dueTimestamp)}:R>`,
                            ].join("\n")), ""),
                        });

                    totalPages > 1 && ebd.setFooter({ text: `(${pages.length + 1}/${totalPages}) - showing ${pollsPerPage} of ${polls.length} total ${autoPlural("poll", polls)}` });

                    pages.push(ebd);
                }

                if(pages.length > 1)
                {
                    const pe = new PageEmbed(pages, int.user.id, {
                        allowAllUsersTimeout: 60 * 1000,
                        goToPageBtn: pages.length > 5,
                    });

                    return pe.useInt(int);
                }
                else
                    return this.editReply(int, pages[0]);
            }
            case "delete":
            {
                action = "deleting a poll";

                await this.deferReply(int);

                const pollId = int.options.get("poll_id", true).value as number;

                const polls = await getPolls(guild.id);

                const poll = polls.find(p => p.pollId === pollId);

                if(!poll)
                    return this.editReply(int, embedify("Couldn't find a poll with this ID.\nUse `/poll list` to list all active polls with their IDs.", settings.embedColors.error));

                const { user, memberPermissions } = int;

                if(!memberPermissions?.has(PermissionFlagsBits.ManageChannels) && user.id !== poll.createdBy)
                    return this.editReply(int, embedify("You are not the author of this poll so you can't delete it.", settings.embedColors.error));

                const pollMsgs = await this.getPollMsgs(poll);

                if(!pollMsgs)
                    return this.editReply(int, embedify("You can only use this command in a server.", settings.embedColors.error));

                const finalVotes = await this.accumulateVotes(pollMsgs.reduce((a, c) => { a.push(c as never); return a; }, []), poll.voteOptions);

                const { peopleVoted, getReducedWinningOpts } = this.parseFinalVotes(finalVotes);

                const btns: Tuple<Tuple<ButtonBuilder, 2>, 1> = [[
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Delete")
                        .setEmoji("🗑️"),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel("Cancel")
                        .setEmoji("❌"),
                ]];

                const bm = new BtnMsg(embedify(`You are about to delete a poll that ${peopleVoted} ${peopleVoted === 1 ? "person" : "people"} have voted on.\nAre you sure you want to delete the poll? This cannot be undone.`, settings.embedColors.warning), btns, { timeout: 30_000 });

                bm.on("press", async (btn, btInt) => {
                    btInt.deferUpdate();

                    let embed: EmbedBuilder | undefined;

                    if(btInt.user.id !== int.user.id)
                        return;

                    if(btn.data.label === "Delete")
                    {
                        try
                        {
                            await Promise.all(pollMsgs.map(m => m.delete()));

                            await deletePoll(poll.guildId, poll.pollId);

                            embed = embedify(`The poll was successfully deleted.\nThe results were:\n${getReducedWinningOpts()}`);
                        }
                        catch(err)
                        {
                            embed = embedify("Couldn't delete the poll due to an error.");
                        }
                    }
                    else if(btn.data.label === "Cancel")
                        embed = embedify("Canceled deletion of the poll.");

                    bm.destroy();

                    embed && int.editReply({
                        ...bm.getReplyOpts(),
                        embeds: [embed],
                    });
                });

                int.editReply(bm.getReplyOpts());
                return;
            }
            }
        }
        catch(err)
        {
            console.log(`Error while ${action}:\n`, err);

            const errReply = useEmbedify(`Error while ${action}: ${err}`, settings.embedColors.error);

            if(int.deferred || int.replied)
                int.editReply(errReply);
            else
                int.reply(errReply);
        }
    }

    async checkPolls()
    {
        const expPolls = await getExpiredPolls();

        for await(const poll of expPolls) {
            const { guildId, pollId, channel, voteOptions, dueTimestamp: endTime } = poll;
            const redisKey = `check_poll_${guildId}-${pollId}`;

            if(!(await redis.get(redisKey)))
                continue;

            await redis.set(redisKey, 1);
 
            try {
                const msgs = await this.getPollMsgs(poll);

                if(msgs && msgs.size > 0) {
                    const firstMsg = msgs.at(0)!;

                    const finalVotes = await this.accumulateVotes(msgs.reduce((a, c) => { a.push(c as never); return a; }, []), voteOptions);

                    const startTime = firstMsg.createdAt;

                    // can't Promise.all() else the api could rate limit us
                    await firstMsg.edit({ embeds: [ this.getConclusionEmbed(finalVotes, startTime, endTime, guildId, channel, firstMsg.id) ] });

                    this.sendConclusion(firstMsg, finalVotes, startTime, endTime);
                }

                deletePoll(guildId, pollId);
            }
            catch(err) {
                // TODO: add logging lib
                console.error(`Error while checking poll with guildId=${guildId} and pollId=${pollId}:\n`, err);
            }
            finally {
                await redis.del(redisKey);
            }
        }
    }

    async getPollMsgs({ guildId, channel, messages }: PollObj)
    {
        const gui = this.client.guilds.cache.find(g => g.id === guildId);
        if(!gui) return;
        const chan = (await gui.channels.fetch()).find(c => c.id === channel);

        return (chan as TextChannel | undefined)?.messages.cache
            .filter(m => messages.includes(m.id))
            .sort((a, b) => a.createdTimestamp < b.createdTimestamp ? 1 : -1);
    }

    getConclusionEmbed(finalVotes: PollVote[], startTime: Date, endTime: Date, guildId: string, channelId: string, firstMsgId: string)
    {
        const {
            finalVotesFields, peopleVoted, totalVotes, winningOptions, getReducedWinningOpts
        } = this.parseFinalVotes(finalVotes);

        return new EmbedBuilder()
            .setTitle("Poll (closed)")
            .setColor(settings.embedColors.default)
            .setDescription([
                `The poll has ended!\nIt ran from <t:${toUnix10(startTime)}:f> to <t:${toUnix10(endTime)}:f>`,
                `${peopleVoted} people have voted ${totalVotes} times and this is what they selected:\n`,
                `${getReducedWinningOpts(3)}${winningOptions.length > 3 ? `\n\nAnd ${winningOptions.length - 3} more.` : ""}\n`,
                `[Click here](https://discord.com/channels/${guildId}/${channelId}/${firstMsgId}) to view the full poll.`,
            ].join("\n"))
            .addFields(finalVotesFields);
    }

    parseFinalVotes(finalVotes: PollVote[])
    {
        const finalVotesFields = CreatePollModal.reduceOptionFields(finalVotes.map(v => `${v.option} - **${v.votes.length}**`, true));

        const scoreColl = new Collection<string, number>();
        finalVotes.forEach(({ votes }) => {
            votes.forEach(user => {
                if(!scoreColl.has(user))
                    scoreColl.set(user, 1);
                else
                    scoreColl.set(user, scoreColl.get(user)! + 1);
            });
        });

        let peopleVoted = 0, totalVotes = 0;

        scoreColl.forEach((score) => {
            peopleVoted++;
            totalVotes += score;
        });

        const sortedVotes = finalVotes.sort((a, b) => a.votes.length < b.votes.length ? 1 : -1);
        const winningOptions = sortedVotes.filter(v => v.votes === sortedVotes[0].votes);

        const getReducedWinningOpts = (limit?: number) =>
            winningOptions.reduce((a, c, i) => `${a}${
                limit === undefined || i < limit
                    ? `\n\n> ${c.emoji} \u200B ${c.option}${winningOptions.length > 1 ? `\nWith **${c.votes} ${autoPlural("vote", c.votes)}**` : ""}`
                    : ""
            }`, "");

        return {
            finalVotesFields,
            scoreColl,
            peopleVoted,
            totalVotes,
            sortedVotes,
            winningOptions,
            /** Call to get a markdown string of the winning options. Default limit (undefined) = list all */
            getReducedWinningOpts,
        };
    }

    sendConclusion(msg: Message, finalVotes: PollVote[], startTime: Date, endTime: Date)
    {
        // TODO:

        const { peopleVoted, getReducedWinningOpts } = this.parseFinalVotes(finalVotes);

        return msg.reply({ embeds: [
            new EmbedBuilder()
                .setColor(settings.embedColors.default)
                .setTitle("This poll has closed.")
                .setDescription(`It ran from <t:${toUnix10(startTime)}:f> to <t:${toUnix10(endTime)}:f>\n${peopleVoted} people have voted and these are the results:\n\n${getReducedWinningOpts()}`)
        ]});
    }

    async accumulateVotes(msgs: Message[], _voteOpts: string[]): Promise<PollVote[]>
    {
        for await(const msg of msgs)
        {
            const reacts = msg.reactions.cache.entries();

            console.log(reacts);
        }

        return [];
    }
}
