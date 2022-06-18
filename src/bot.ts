import { Client, MessageEmbed, TextBasedChannel } from "discord.js";
import dotenv from "dotenv";
import k from "kleur";
import { allOfType, system, Stringifiable } from "svcorelib";

import persistentData from "./persistentData";
import botLogs from "./botLogs";
import { initRegistry, registerGuildCommands, registerEvents, getCommands, btnPressed, modalSubmitted } from "./registry";
import { commands as slashCmds } from "./commands";
import { settings } from "./settings";
import { prisma } from "./database/client";
import { checkContestTimes, getContestWinners } from "./database/contest";
import { Contest, ContestSubmission, Guild } from "@prisma/client";
import { hyperlink, roleMention, time, userMention } from "@discordjs/builders";

const { env, exit } = process;

dotenv.config();


async function init()
{
    console.log("Initializing...\n");

    if(!allOfType([ env.BOT_TOKEN, env.CLIENT_ID ], "string"))
        throw new Error("Missing environment variable(s). Please correct them according to the .env.template");

    await persistentData.init();


    const client = new Client({
        intents: settings.client.intents,
    });

    client.login(env.BOT_TOKEN ?? "ERR_NO_ENV");


    client.on("ready", async (cl) => {
        const { user, guilds } = cl;

        user.setPresence({
            status: "dnd",
            activities: [{ type: "PLAYING", name: "starting up..." }]
        });


        botLogs.init(cl);

        initRegistry(cl);


        const evts = registerEvents().filter(e => e.enabled);

        console.log(`• Registered ${k.green(evts.length)} client event${evts.length != 1 ? "s" : ""}`);
        printDbgItmList(evts.map(e => e.constructor.name ?? e.names.join("&")));

        await registerCommands(cl);



        user.setPresence({
            status: "online",
            activities: [{ type: "WATCHING", name: "ur mom" }],
        });

        await doContestStuff(cl);

        console.log(`• ${user.username} is listening for commands and events in ${k.green(guilds.cache.size)} guild${guilds.cache.size != 1 ? "s" : ""}`);

        printDbgItmList(guilds.cache.map(g => g.name), 4);

        settings.debug.bellOnReady && console.log("\u0007");

        process.stdin.isTTY && awaitKeypress();
    });

    client.on("error", err => {
        console.error(`${k.red("Client error:")}\n${err}`);
    });


    ["SIGINT", "SIGTERM"].forEach(sig => process.on(sig, async () => {
        console.log("Shutting down...");

        prisma.$disconnect();

        client.user?.setPresence({
            status: "dnd",
            activities: [{ type: "PLAYING", name: "shutting down..." }]
        });

        exit(0);
    }));
}

async function awaitKeypress()
{
    const key = await system.pause(`Actions: E${k.red("[x]")}it`);

    switch(key)
    {
    case "x":
        return process.exit(0);
    }

    awaitKeypress();
}

/**
 * Registers all the bot's slash commands  
 * What gets registered is defined by the `index.ts` in the `commands` folder
 */
async function registerCommands(client: Client)
{
    try
    {
        // register guild commands
        // see https://discordjs.guide/interactions/slash-commands.html#guild-commands

        const guilds = client.guilds.cache.map(g => g.id);

        await registerGuildCommands(guilds);
    }
    catch(err)
    {
        console.error(k.red("Error while registering commands:\n") + (err instanceof Error) ? String(err) : "Unknown Error");
    }

    try
    {
        // listen for slash commands

        const cmds = getCommands();

        if(!cmds)
            throw new Error("No commands found to listen to");

        console.log(`• Registered ${k.green(slashCmds.length)} slash command${slashCmds.length != 1 ? "s" : ""}`);
        printDbgItmList(cmds.map(c => c.meta.name));

        client.on("interactionCreate", async (int) => {
            if(int.isCommand())
            {
                const { commandName, options } = int;

                const opts = options.data && options.data.length > 0 ? options.data : undefined;

                const cmd = cmds.find(({ meta }) => meta.name === commandName);

                if(!cmd || !cmd.enabled)
                    return;

                await cmd.tryRun(int, Array.isArray(opts) ? opts[0] : opts);
            }
            else if(int.isButton()) {
                await btnPressed(int);
            }
            else if(int.isModalSubmit()) {
                await modalSubmitted(int);
            }
        });
    }
    catch(err: unknown)
    {
        console.error(k.red("Error while listening for slash commands:\n") + k.red(err instanceof Error ? String(err) : "Unknown Error"));
    }
}

/** Prints a styled list of items to the console * @param limit Max amount of items per line */
function printDbgItmList(list: string[] | Stringifiable[], limit = 6)
{
    let msg = "";

    list = list.map(itm => itm.toString()).sort();

    while(list.length > 0)
    {
        const items = list.splice(0, limit);
        msg += `│ ${k.gray(`${items.join(", ")}${items.length === 8 ? "," : ""}`)}\n`;
    }

    console.log(msg);
}

async function doContestStuff(cl: Client) {
    console.log("checking contest stuff");
    const { starting, ending } = await checkContestTimes();

    runStartingContestsJobs(cl, starting);
    runEndingContestsJobs(cl, ending);

    setInterval(async () => {
        console.log("checking contest stuff");
        const { starting, ending } = await checkContestTimes();

        console.log(starting);
        console.log(ending);

        runStartingContestsJobs(cl, starting);
        runEndingContestsJobs(cl, ending);
    }, 3600000);
}

function runStartingContestsJobs(cl: Client, starting: (Contest & { guild: Guild })[]) {
    starting.forEach(contest => {
        console.log("getting ready to start contest: " + contest.id);
        const timeTillStart = contest.startDate.getTime() - new Date().getTime();

        const description = `${contest.description}\n\n\n\nuse \`/contest submit ${contest.id}\` to submit your entry\n\n24 hour voting period will start after the deadline`;

        const embed = new MessageEmbed()
            .setAuthor({ name: "Contest Started!" })
            .setTitle(contest.name)
            .setDescription(description)
            .setColor(settings.embedColors.default)
            .addField("Start", time(contest.startDate), true)
            .addField("End", time(contest.endDate), true)
            .setFooter({ text: `Contest ID: ${contest.id}` });

        setTimeout(async () => {
            await (cl.channels.cache.find(channel => channel.id === contest.guild.contestChannelId) as TextBasedChannel).send({
                content: roleMention(contest.guild.contestRoleId ?? "New Contest"),
                embeds: [embed]
            });
        }, timeTillStart);
    });
}

function runEndingContestsJobs(cl: Client, ending: (Contest & { guild: Guild, submissions: ContestSubmission[] })[]) {
    ending.forEach(contest => {
        console.log("getting ready to end contest: " + contest.id);
        const timeTillEnd = contest.endDate.getTime() - new Date().getTime();

        const votingEnd = new Date(contest.endDate.setDate(contest.endDate.getDate() + 1));
        const description = `${contest.description}\n\nYou have 24 hours to vote. You can vote with \`/contest vote\`\nVoting will end at ${time(votingEnd)}`;

        let submissions = "";

        if (!contest.submissions.length) {
            submissions = "No submissions :(";
        }

        contest.submissions.forEach(submission => {
            const user = cl.guilds.cache.get(submission.guildId)?.members.cache.get(submission.userId)?.user;

            const link = hyperlink(user?.username ?? userMention(submission.userId), submission.content);

            submissions += `- ${link}\n`;
        });


        const votingEmbed = new MessageEmbed()
            .setAuthor({ name: "Voting Time!" })
            .setTitle(contest.name)
            .setDescription(description)
            .setColor(settings.embedColors.default)
            .addField("Submissions", submissions)
            .setFooter({ text: `Contest ID: ${contest.id}` });


        setTimeout(async () => {
            await (cl.channels.cache.find(channel => channel.id === contest.guild.contestChannelId) as TextBasedChannel).send({
                content: roleMention(contest.guild.contestRoleId ?? "Voting Started"),
                embeds: [votingEmbed]
            });
        }, timeTillEnd);

        setTimeout(async () => {
            const winners = await getContestWinners(contest.guildId, contest.id);

            const authorText = winners.length ? "We have a winner!" : "We have no winners :(";

            let winnersResult = "";

            if (!winners.length) {
                winnersResult = "No winners";
            }

            winners.forEach((winner, i) => {
                const pos = i == 0 ? "1st" : i == 1 ? "2nd" : "3rd";
                winnersResult += `${pos}: ${hyperlink(userMention(winner.userId), winner.content)} (${winner._count.votes})\n`;
            });

            const winnerEmbed = new MessageEmbed()
                .setAuthor({ name: authorText })
                .setTitle(contest.name)
                .setDescription(contest.description)
                .setColor(settings.embedColors.default)
                .addField("Result", winnersResult)
                .setFooter({ text: `Contest ID: ${contest.id}` });

            await (cl.channels.cache.find(channel => channel.id === contest.guild.contestChannelId) as TextBasedChannel).send({
                content: roleMention(contest.guild.contestRoleId ?? "Winner Announcement"),
                embeds: [winnerEmbed]
            });
        }, 24 * 3600 * 1000);
    });
}

init();
