import { getCoins, getLastDaily, getLastWork, getTotalWorks } from "@src/database/economy";
import { createNewGuild, createGuildSettings, getGuild, setGuild, getGuildSettings, setGuildSettings } from "@src/database/guild";
import { createNewMember, getMember } from "@src/database/users";
import k from "kleur";
import { exit } from "process";
import prompt from "prompts";

// TODO: trigger redis to invalidate its cached shit if something is changed

run();

//#SECTION choose user or guild

async function run()
{
    const { type } = await prompt({
        type: "select",
        message: "What do you want to configure?",
        name: "type",
        choices: [
            { value: "guild", title: "Guild" },
            { value: "member", title: "Member" },
            { value: "exit", title: k.yellow("Exit") },
        ],
    });

    (!type || type === "exit") && exit();

    const { guildId } = await prompt({
        type: "text",
        message: "Enter the Guild ID",
        name: "guildId",
        validate: val => val.match(/^\s*\d{16,}\s*$/),
    });

    !guildId && exit();

    switch(type)
    {
    case "guild":
        return await configureGuild(guildId.trim());
    case "member":
    {
        const { userId } = await prompt({
            type: "text",
            message: "Enter the User ID",
            name: "userId",
            validate: val => val.match(/^\s*\d{16,}\s*$/),
        });

        !userId && exit();

        return await configureMember(guildId.trim(), userId.trim());
    }
    }
}

//#SECTION guild

async function configureGuild(id: string): Promise<unknown>
{
    let guild = await getGuild(id);
    if(!guild)
    {
        if((await prompt({ type: "confirm", message: "Guild doesn't exist. Create it?", name: "val" })).val)
        {
            await createGuildSettings(id);
            guild = await createNewGuild(id);
        }
        else
            return await run();
    }

    let guildSettings = await getGuildSettings(id);
    if(!guildSettings)
        guildSettings = await createGuildSettings(id);

    const { opt } = await prompt({
        type: "select",
        message: "What option do you want to modify?",
        name: "opt",
        choices: [
            { value: "premium", title: `guild.premium [${k.gray(String(guild.premium))}]` },
            { value: "contestRoleId", title: `guildSettings.contestRoleId [${k.gray(String(guildSettings.contestRoleId))}]` },
            { value: "contestChannelId", title: `guildSettings.contestChannelId [${k.gray(String(guildSettings.contestChannelId))}]` },
            { value: "djRoleIds", title: `guildSettings.djRoleIds [${k.gray(String(guildSettings.djRoleIds))}]` },
            { value: "djOnly", title: `guildSettings.djOnly [${k.gray(String(guildSettings.djOnly))}]` },
            { value: "botLogChannel", title: `guildSettings.botLogChannel [${k.gray(String(guildSettings.botLogChannel))}]` },
            { value: "warningThreshold", title: `guildSettings.warningThreshold [${k.gray(String(guildSettings.warningThreshold))}]` },
            { value: "banVoteAmt", title: `guildSettings.banVoteAmt [${k.gray(String(guildSettings.banVoteAmt))}]` },
            { value: "back", title: k.yellow("Back") },
        ],
    });

    switch(opt)
    {
    case "premium":
    {
        const premium = await boolPrompt(`Current value: ${guild.premium}\nSet a new value:`);
        if(typeof premium === "boolean")
        {
            guild.premium = premium;
            await setGuild(guild);
        }
        break;
    }
    case "contestRoleId":
    {
        const contestRoleId = await stringPrompt(`Current value: ${guildSettings.contestRoleId}\nSet a new value (empty for null):`);

        guildSettings.contestRoleId = !contestRoleId || contestRoleId.length === 0 ? null : contestRoleId;
        await setGuildSettings(id, guildSettings);
        break;
    }
    case "contestChannelId":
    {
        const contestChannelId = await stringPrompt(`Current value: ${guildSettings.contestChannelId}\nSet a new value (empty for null):`);

        guildSettings.contestChannelId = !contestChannelId || contestChannelId.length === 0 ? null : contestChannelId;
        await setGuildSettings(id, guildSettings);
        break;
    }
    case "djRoleIds":
    {
        const djRoleIds = await stringPrompt(`Current value: ${guildSettings.djRoleIds}\nSet a new value (comma-separated, empty for null):`);

        guildSettings.djRoleIds = !djRoleIds || djRoleIds.length === 0 ? [] : djRoleIds.split(",");
        await setGuildSettings(id, guildSettings);
        break;
    }
    case "djOnly":
    {
        const djOnly = await boolPrompt(`Current value: ${guildSettings.djOnly}\nSet a new value:`, true);

        guildSettings.djOnly = djOnly;
        await setGuildSettings(id, guildSettings);
        break;
    }
    case "botLogChannel":
    {
        const botLogChannel: string | undefined | null = await stringPrompt(`Current value: ${guildSettings.botLogChannel}\nSet a new value (empty for null):`);

        guildSettings.botLogChannel = !botLogChannel || botLogChannel.length === 0 ? null : botLogChannel;
        await setGuildSettings(id, guildSettings);
        break;
    }
    case "warningThreshold":
    {
        const warningThreshold: string | undefined | null = await stringPrompt(`Current value: ${guildSettings.warningThreshold}\nSet a new value (empty for 3):`);

        guildSettings.warningThreshold = !warningThreshold || warningThreshold.length === 0 ? 3 : parseInt(warningThreshold);
        await setGuildSettings(id, guildSettings);
        break;
    }
    case "banVoteAmt":
    {
        const banVoteAmt: string | undefined | null = await stringPrompt(`Current value: ${guildSettings.banVoteAmt}\nSet a new value (empty for 2):`);

        guildSettings.banVoteAmt = !banVoteAmt || banVoteAmt.length === 0 ? 2 : parseInt(banVoteAmt);
        await setGuildSettings(id, guildSettings);
        break;
    }
    case "back":
        return await run();
    default:
        return exit();
    }
    return await configureGuild(id);
}

//#SECTION user

async function configureMember(guildId: string, userId: string): Promise<unknown>
{
    // TODO(esvee): this not worki
    let member = await getMember(guildId, userId);
    if(!member)
    {
        if((await prompt({ type: "confirm", message: "Member doesn't exist. Create it?", name: "val" })).val)
            member = await createNewMember(guildId, userId, 0);
        else
            return await run();
    }

    const bonus = {
        lastdaily: await getLastDaily(userId, guildId),
        lastwork: await getLastWork(userId, guildId),
        totalworks: await getTotalWorks(userId, guildId),
    };

    const coins = await getCoins(userId, guildId) ?? 0;

    const { opt } = await prompt({
        type: "select",
        message: "What option do you want to modify?",
        name: "opt",
        choices: [
            { value: "premium", title: `bonus.lastdaily [${k.gray(String(bonus.lastdaily))}]` },
            { value: "premium", title: `bonus.lastwork [${k.gray(String(bonus.lastwork))}]` },
            { value: "premium", title: `bonus.totalworks [${k.gray(String(bonus.totalworks))}]` },
            { value: "premium", title: `coins.amount [${k.gray(String(coins))}]` },
            { value: "back", title: k.yellow("Back") },
        ],
    });

    switch(opt)
    {
    case "back":
        return await run();
    default:
        return exit();
    }
}

//#SECTION prompts

async function boolPrompt(message: string, nullOption = false): Promise<boolean | null>
{
    const choices: prompt.Choice[] = [
        { title: "true", value: true },
        { title: "false", value: false },
    ];

    nullOption && choices.push({ title: "null", value: null });

    return (await prompt({
        type: "select",
        message: message,
        name: "val",
        choices,
    })).val ?? null;
}

async function stringPrompt(message: string): Promise<string | undefined>
{
    return (await prompt({
        type: "text",
        message: message,
        name: "val",
    })).val;
}
