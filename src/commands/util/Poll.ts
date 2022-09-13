import { ApplicationCommandOptionType, Client, Collection, CommandInteraction, CommandInteractionOption, EmbedBuilder, Message, TextChannel } from "discord.js";
import { Command } from "@src/Command";
import { CreatePollModal } from "@src/modals/poll";
import { embedify, PageEmbed, toUnix10 } from "@src/utils";
import { settings } from "@src/settings";
import { deletePoll, getExpiredPolls, getPolls } from "@src/database/guild";
import k from "kleur";

interface PollVote<M = Message, O = string> {
    msg: M;
    emoji: string;
    option: O;
    votes: string[]
}

export class Poll extends Command
{
    private interval?: NodeJS.Timer;
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
                            name: "headline",
                            desc: "Enter pings (be mindful of who you ping) or extra explanatory text to notify users of this poll",
                            type: ApplicationCommandOptionType.String,
                        },
                        {
                            name: "votes_per_user",
                            desc: "How many times a user is allowed to vote",
                            type: ApplicationCommandOptionType.Number,
                            min: 1,
                        },
                        {
                            name: "title",
                            desc: "The title of the poll message",
                            type: ApplicationCommandOptionType.String,
                        },
                        // TODO:
                        // {
                        //     name: "allow_rethinking",
                        //     desc: "Set this to false to disallow people to change their mind and choose another option.",
                        //     type: ApplicationCommandOptionType.Boolean,
                        // },
                    ],
                },
                {
                    name: "list",
                    desc: "Lists all polls that are active on this server",
                },
                // {
                //     name: "cancel",
                //     desc: "Cancels a poll",
                //     perms: [PermissionFlagsBits.ManageChannels],
                // },
            ],
        });

        this.client = client;
    
        try {
            this.checkPolls();
            this.interval = setInterval(this.checkPolls, 2000);
        }
        catch(err) {
            console.error(k.red("Error while checking polls:"), err);
        }

        ["SIGINT", "SIGTERM"].forEach(sig => process.on(sig, () => clearInterval(this.interval)));
    }

    async run(int: CommandInteraction, opt: CommandInteractionOption): Promise<void>
    {
        const { guild, channel } = int;

        if(!guild || !channel)
            return this.reply(int, embedify("Please use this command in a server.", settings.embedColors.error), true);

        switch(opt.name)
        {
        case "create":
        {
            const headline = int.options.get("headline")?.value as string | undefined;
            const votes_per_user = int.options.get("votes_per_user")?.value as number | undefined;
            const title = int.options.get("title")?.value as string | undefined;

            const modal = new CreatePollModal(headline, votes_per_user, title);

            return await int.showModal(modal.getInternalModal());
        }
        case "list":
        {
            // TODO:FIXME: Couldn't run the command due to an error: Received one or more errors

            await this.deferReply(int);

            const polls = await getPolls(guild.id);

            if(!polls || polls.length === 0)
                return this.editReply(int, embedify("Currently no polls are active on this server.\nYou can create a new one with `/poll create`", settings.embedColors.error));

            const pollList = [...polls];
            const pages: EmbedBuilder[] = [];
            const pollsPerPage = 8;
            const totalPages = Math.ceil(polls.length / pollsPerPage);

            while(pollList.length > 0)
            {
                const pollSlice = pollList.splice(0, pollsPerPage);

                const ebd = new EmbedBuilder()
                    .setTitle("Active polls")
                    .setDescription(polls.length != 1 ? `Currently there's ${polls.length} active polls.` : "Currently there's only 1 active poll.")
                    .setColor(settings.embedColors.default)
                    .addFields({
                        name: "\u200B",
                        value: pollSlice.reduce((a, c) => ([
                            `${a}\n`,
                            `> **\`${c.pollId}\`** - by <@${c.createdBy}>${c.topic ? "" : ` in <#${c.channel}>`} - [show poll <:open_in_browser:994648843331309589>](https://discord.com/channels/${c.guildId}/${c.channel}/${c.messages[0]})`,
                            `> Ends <t:${toUnix10(c.dueTimestamp)}:R>`,
                            ...(c.topic ? [`> **Topic:**${c.topic.length > 64 ? "\n> " : " "}${c.topic.replace(/[`]{3}\w*/gm, "").replace(/\n+/gm, " ")}`] : []),
                        ].join("\n")), ""),
                    });

                totalPages > 1 && ebd.setFooter({ text: `(${pages.length + 1}/${totalPages}) - showing ${pollsPerPage}` });

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
        case "cancel":
        {
            // TODO:
            return;
        }
        }
    }

    async checkPolls()
    {
        const expPolls = await getExpiredPolls();

        for await(const { guildId, pollId, channel, messages, voteOptions, dueTimestamp: endTime } of expPolls)
        {
            try
            {
                const gui = this.client.guilds.cache.find(g => g.id === guildId);
                const chan = gui?.channels.cache.find(c => c.id === channel);
                const msgs = (chan as TextChannel | undefined)?.messages.cache
                    .filter(m => messages.includes(m.id))
                    .sort((a, b) => a.createdTimestamp < b.createdTimestamp ? 1 : -1);

                if(msgs && msgs.size > 0)
                {
                    const firstMsg = msgs.at(0)!;

                    const finalVotes = await this.accumulateVotes(msgs.reduce((a, c) => { a.push(c as never); return a; }, []), voteOptions);

                    const startTime = firstMsg.createdAt;

                    // can't Promise.all() else the api could rate limit us
                    await firstMsg.edit({ embeds: [ this.getConclusionEmbed(finalVotes, startTime, endTime, guildId, channel, firstMsg.id) ] });

                    this.sendConclusion(firstMsg, finalVotes, startTime, endTime);
                }

                deletePoll(guildId, pollId);
            }
            catch(err)
            {
                // TODO: add logging lib
                console.error(`Error while checking poll with guildId=${guildId}, pollId=${pollId} and channel=${channel}:\n`, err);
            }
        }
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
                !limit || i < limit
                    ? `\n\n> ${c.emoji} \u200B ${c.option}${winningOptions.length > 1 ? `\nWith **${c.votes} votes**` : ""}`
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

    async sendConclusion(msg: Message, finalVotes: PollVote[], startTime: Date, endTime: Date)
    {
        // TODO:

        const { peopleVoted, getReducedWinningOpts } = this.parseFinalVotes(finalVotes);

        await msg.reply({ embeds: [
            new EmbedBuilder()
                .setColor(settings.embedColors.default)
                .setTitle("This poll has closed.")
                .setDescription(`It ran from <t:${toUnix10(startTime)}:f> to <t:${toUnix10(endTime)}:f>\n${peopleVoted} people have voted and these are the results:\n\n${getReducedWinningOpts()}`)
        ]});
    }

    async accumulateVotes(msgs: Message[], _voteOpts: string[]): Promise<PollVote[]>
    {
        for(const msg of msgs as unknown as Message[])
        {
            const reacts = msg.reactions.cache.entries();

            console.log(reacts);
        }

        return [];
    }
}
