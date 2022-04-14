import { ApplicationCommandDataResolvable, Client } from "discord.js";
import dotenv from "dotenv";
import k from "kleur";
import { Command } from "./Command";
import { commands } from "./commands";

dotenv.config();

function init()
{
	const client = new Client({
		intents: [ "GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "GUILD_PRESENCES" ],
	});

	client.login(process.env.BOT_TOKEN);

	client.on("ready", async ({ user, guilds }) => {
		console.log(`${user.username} is ready in ${k.green(guilds.cache.size)} guild${guilds.cache.size != 1 ? "s" : ""}.`);

		await registerCommands(client);
	});

	client.on("error", err => {
		console.error(`${k.red("Client error:")}\n${err}`);
	});
}

/** After `registerCommands()` finishes, this contains all command class instances */
const cmds: Command[] = [];

/**
 * Registers all the bots' slash commands  
 * What gets registered is defined by the `index.ts` in the `commands` folder
 */
async function registerCommands(client: Client)
{
	const { guilds } = client;
	const slashCmds: ApplicationCommandDataResolvable[] = [];

	try
	{
		commands.forEach(CmdClass => cmds.push(new CmdClass()));

		for(const c of cmds)
			slashCmds.push(c.getSlashCmdJson());

		guilds.cache.forEach(async guild => {
			const slashCmdsData = await guild.commands.set(slashCmds);

			console.log(`Registered ${k.green(slashCmdsData.size)} slash command${slashCmdsData.size != 1 ? "s" : ""}.`);
		});

		client.on("guildCreate", async guild => {
			try
			{
				await guild.commands.set(slashCmds);
			}
			catch (err)
			{
				console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
			}
		});

		// listen for slash commands

		client.on("interactionCreate", interaction => {
			if(!interaction.isCommand())
				return;

			const { commandName } = interaction;

			const cmd = cmds.find(({ meta }) => meta.name === commandName);

			if(!cmd)
				return;

			cmd.tryRun(interaction);
		});
	}
	catch(err: unknown)
	{
		console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
	}
}

init();
