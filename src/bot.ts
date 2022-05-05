import { ApplicationCommandDataResolvable, Client } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";
import k from "kleur";
import { Command } from "./Command";
import { commands } from "./commands";

dotenv.config();

const rest = new REST({
	version: "9"
}).setToken(process.env.BOT_TOKEN ?? "ERR_NO_ENV");

function init()
{
	const client = new Client({
		intents: [ "GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "GUILD_PRESENCES" ],
	});

	client.login(process.env.BOT_TOKEN);

	client.on("ready", async ({ user, guilds }) => {
		console.log(`${user.username} is ready in ${k.green(guilds.cache.size)} guild${guilds.cache.size != 1 ? "s" : ""}`);

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
	const slashCmds: ApplicationCommandDataResolvable[] = [];

	try
	{
		commands.forEach(CmdClass => cmds.push(new CmdClass()));

		for(const c of cmds)
			slashCmds.push(c.getSlashCmdJson());

		await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID ?? "ERR_NO_ENV"), {
				body: slashCmds
			},
		);

		console.log(`Registered ${k.green(slashCmds.length)} command${slashCmds.length != 1 ? "s" : ""}`);

		// listen for slash commands

		client.on("interactionCreate", async interaction => {
			if(!interaction.isCommand())
				return;

			const { commandName } = interaction;

			const cmd = cmds.find(({ meta }) => meta.name === commandName);

			if(!cmd)
				return;

			await cmd.tryRun(interaction);
		});
	}
	catch(err: unknown)
	{
		console.error(k.red(err instanceof Error ? String(err) : "Unknown Error"));
	}
}

init();
