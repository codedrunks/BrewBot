#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const yargs = require("yargs");
const { readFile } = require("fs-extra");
const { resolve } = require("path");
const { spawn } = require("child_process");
const k = require("kleur");
const { Errors } = require("svcorelib");

try
{
    run();
}
catch(err)
{
    console.error(`${k.red("Error:")} ${err}`);
    process.exit(1);
}

async function run()
{
    process.chdir(resolve(__dirname, "../../"));

    const args = await prepareCLI();

    const cmd = args && args._ ? args._[0] : null;

    let command, commandArgs = [], needsStdin = false;

    switch(cmd)
    {
    case "start":
    case "run":
        if(args.w)
        {
            command = "npm run watch";
            needsStdin = true;
        }
        else
            command = "npm start";
        break;
    case "win-redis":
        command = "npm run win-redis";
        break;
    case "lint":
        command = "npm run lint";
        break;
    case "deploy":
        command = "npm run deploy";
        break;
    default:
        if(typeof cmd !== "string")
            return console.log(`${k.yellow("Please enter a command to run.")}\nUse ${k.underline("brewbot -h")} for a list of commands.`);

        throw new Error(`Unrecognized command "${cmd}"`);
    }

    if(needsStdin && !process.stdin.isTTY)
        throw new Errors.NoStdinError(`A stdin stream is needed to run the command "brewbot ${cmd}"`);

    spawn(command, commandArgs, { stdio: "inherit", shell: true });
}

async function prepareCLI()
{
    const { version } = JSON.parse((await readFile("./package.json")).toString());

    //#SECTION general
    yargs.scriptName("brewbot")
        .usage(`Usage: $0 <command> ${k.gray("[<args>]")}`)
        .version(`BrewBot v${version}`)
        .alias("v", "version")
        .help()
        .alias("h", "help");

    //#SECTION commands
    yargs.command([ "start", "run" ], `Starts BrewBot (like ${k.gray("npm start")}, use ${k.gray("-w")} to watch for changes)`, cmd => 
        cmd.option("watch", {
            describe: "Watches for file changes to automatically restart the bot",
            alias: "w",
            type: "boolean",
        })
    );

    yargs.command([ "win-redis" ], "Starts redis in a new WSL window on Windows");

    yargs.command([ "lint" ], "Lints the code");

    yargs.command([ "deploy" ], "Runs prisma deployment scripts and launches the bot without watching");

    yargs.wrap(Math.min(100, process.stdout.columns));

    yargs.epilogue("For command-specific help and to view their arguments use '$0 -h <command>'");

    return yargs.argv;
}
