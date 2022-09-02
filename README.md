# Brew Bot
![Node CI](https://github.com/codedrunks/BrewBot/workflows/Node%20CI/badge.svg)

## Table of contents
- [Installation](#installation)
- [Development](#development)
    - [Project structure](#project-structure)
    - [Slash commands](#slash-commands)
    - [Context menu commands](#context-menu-commands)
    - [Other](#other)
- [CLI](#cli)
    - [General](#general)
    - [Prisma](#prisma)
- [Debugging](#debugging)
- [Redis](#redis)
- [Discord API quirks](#discord-api-quirks)
    - [Length limits](#length-limits)
- [Classes](#classes)
    - [BtnMsg](#btnmsg)
    - [PageEmbed](#pageembed)
    - [Modal](#modal)

<br><br>

### Invite URL
```
https://discord.com/oauth2/authorize?client_id=__CLIENT_ID__&permissions=8&scope=bot%20applications.commands
```

<br>

## Installation:
1. Install Node.js (v16.9+), npm (v8+) and Postgres
2. Install GTK2 and libjpeg-turbo by following [this guide](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows#2-installing-gtk-2)
3. [Install Redis](#redis)
4. Set up a psql user and DB schema for the bot
5. Run `npm i` to install dependencies
6. Run `npx prisma migrate reset` to initialize the DB schema
7. Copy `.env.template` to `.env` and enter all values
8. See [CLI](#cli) for further commands

<br>

## Development:
### Project structure:
Commands, events and context menus have template files in their respective folders called `Template.ts`, use these to create new commands and events.  
In order for a command or event to be initialized on startup, add it to the array of the `index.ts` file in the respective folder.

<br>

### Slash commands:
At the moment, `src/bot.ts` only sets guild-specific commands as these update pretty quickly (global commands take up to an hour to propagate).  
The regular Discord client doesn't update the locally saved slash commands when the bot restarts, so it's sometimes necessary to reload the Discord app with `Ctrl+R`  
If that still didn't work, or when you just want to remove a command or change its arguments, it's sometimes also necessary to delete them from Discord servers entirely.  
The bot inserts a fresh copy of all commands at next startup. To clear all global commands and guild commands, use `npm run clearCommands`

<br>

### Context menu commands:
There are two types of context menus; message and user. This dictates where they will be situated in the Discord client and what properties are passed.  
Use `int.isUserContextMenu()` and `int.isMessageContextMenu()` to tell TS what type of context menu it's dealing with, then you will be able to access the `int.targetMessage` or `int.targetUser` and `int.targetMember` props.  
Other than how the commands are sent and that a user can't pass any arguments, context commands are pretty much the same as slash commands.  
  
To create a new context menu, use the Template.ts in `src/context/` to create a sub-class of `src/CtxMenu.ts`  
Make sure the file and class name are changed, and the meta object in the constructor is filled out.  
To specify who can use the context command, use the `memberPerms` meta prop.  
Lastly, as with slash commands, add the class to the array in `src/context/index.ts`

<br>

### Other:
Install these VS Code extensions for code auto-fix on save and special text highlighting:  
- `dbaeumer.vscode-eslint`
- `fabiospampinato.vscode-highlight`

<br>

### Data persistence:
Some data persistence is still done through the `data.json` file, which is kept up by `src/persistentData.ts`  
This will probably change. Prisma is the new database provider, please see usage in [CLI/Prisma.](#prisma)  
  
All database utils can be found in `/src/database`, the functions are organized in files based on what part of the database they are associated with, i.e. all user related functions such as creating a new user or deleting a user are in `/src/database/users.ts`. When creating new utils, please follow this standard accordingly.  
  
See prisma docs [here](https://www.prisma.io/docs/) and a reference to the node client library [here.](https://www.prisma.io/docs/reference)

### Redis:
Redis is an in-memory cache to keep highly accessed values in a place that is fast to access and update.
Setting up redis is easy for your distro of linux and if you are developing on Windows, can be installed through WSL, see docs for installation [here.](https://redis.io/docs/getting-started/installation/)

Launching redis is as simple as running `redis-server`.

When launching to production, you want redis to be daemonized, this can be done with systemd[^1] by default on most linux distributions using `sudo systemctl start redis` and `sudo systemctl enable redis` to enable launch on reboot, or you can do that with something like [pm2](https://pm2.keymetrics.io/) or [screen](https://linuxize.com/post/how-to-use-linux-screen/) or Windows Task Scheduler (see below), but can also be done manually with some configuration, see details [here.](https://redis.io/docs/getting-started/)
  
[^1]: If you are using systemd, create a `redis.conf` in `/etc/redis/redis.conf` and make sure to add the line `supervised systemd`.  
  
In our specific application, your redis-server must be running on `127.0.0.1:6379` which is the default for redis-server, and if you are on windows, make sure to add the line `localhostForwarding=true` to your .wslconfig located in `%UserProfile%\.wslconfig`, if this file does not exist, please create one and be sure to add the header `[wsl2]` or `[wsl1]`. Also if you are on windows, be aware that WSL does not keep applications alive without a bash terminal running, so do not close the WSL window while developing.

Another thing is to have a config for your instance of Redis, in testing/development you can do something like this to have an instance that does not save to disk. On WSL, you must do this because redis will not have write permissions to save to disk.
```sh
cd ~
mkdir redis
cd redis
touch redis.conf
redis-server redis.conf # run this in a separate window
redis-cli config set save ""
redis-cli config rewrite
```
  
After it was installed on the default WSL shell, if you want Redis to automatically launch on Windows startup, you can use Task Scheduler.  
Create a new task (not basic task) in Task Scheduler that runs `src/tools/redis.bat` whenever your user logs on, [see guide.](https://winaero.com/run-app-or-script-at-logon-with-task-scheduler-in-windows-10/#How_to_Run_App_or_Script_at_Logon_with_Task_Scheduler_in_Windows_10)  
Then, right-click the finished task and click "Run" to test it.

<br>

## CLI
### General
| Command | Description |
| --- | --- |
| `npm start` | start the bot regularly |
| `npm run watch` | start the bot and watch for file changes to recompile automatically |
| `npm run lint` | lints the code with eslint |
| `npm test` | runs the script at `src/test.ts` |
| `npm run clearCommands` | clears all global and guild commands (takes a few minutes) |
| `npm run deploy` | runs prisma deployment scripts and launches the bot without watching |
| `npm run win-redis` | use this command on Windows devices to launch redis-server in a WSL window |

<br>

### Prisma
| Command | Description |
| --- | --- |
| `npx prisma db push` | this will update your local db to reflect any changes in your schema.prisma file, use this while making changes that you want to see |
| `npx prisma migrate dev --name "describe_change_short"` | creates a database migration and updates the local database if there is one, use this once your changes to the schema.prisma file are done, do not use constantly for little changes, use the above command instead |
| `npx prisma migrate deploy` | this will deploy any changes to the local database, this is how you deploy migrations in production |
| `npx prisma migrate reset` | this will reset the localdatabase and re-apply any migrations, use this in testing if you make breaking changes or need a reset |
| `npx prisma migrate dev --create-only` | not usually needed, this will create a migration without applying it incase you need to manually change the SQL in the migration file |
| `npx prisma format` | this formats the schema.prisma file and can also auto-complete foreign key association |
| `npx prisma db seed` | this command seeds the database according to `prisma/seed.ts` |

<br>

## Debugging
Debugging through VS Code works just fine, including breakpoints.  
Select "Launch" in the debugger pane, then press F5 to launch the debugger.  
Select the "test.ts" profile to debug the script at `src/test.ts`

<br>

## Discord API quirks
- (Sub)Command names and command option names need to be lowercase only with no spaces (underscores are fine).
- If you get **ANY** discord api related error then any changes that have been made to commands won't be registered until the error is fixed.

<br>

### Length limits
| What | Limit |
| --- | --- |
| username | 1-80 chars |
| message content | 2000 chars |
| files per message | 10 files |
| embeds per message | 10 embeds |
| embed title | 256 chars |
| embed description | 2048 chars |
| embed author name | 256 chars |
| embed fields | 25 fields |
| embed field name | 256 chars |
| embed field value | 1024 chars |
| embed footer text | 2048 chars |
| sum of all chars in embed | 6000 chars |
| slash command description | 100 chars |
| slash command arg description | 100 chars |


<br><br>

## Classes

> ### BtnMsg
> To use the new message buttons, this class handles the communication between the `bot.ts` event listener and the slash command's scope.  
>   
> For the `buttons` constructor param, **don't set a `customId`** as the registry assigns own IDs automatically.  
>   
> #### Methods:
> - `destroy()` emits the `destroy` event, removes all event listeners and tells the registry to deregister this BtnMsg
> - `getReplyOpts()` returns properties that can be spread onto an interaction reply like `int.reply({ ...btmsg.getReplyOpts(), foo: "bar" })`
> - `getMsgOpts()` same as `getReplyOpts()` but for sending a message with `channel.send()`
> - `sendIn()` sends this BtnMsg in the provided channel
>   
> #### Events:
> Use `BtnMsg.on("name", (args) => {})` to subscribe to them
> - `press` is emitted whenever the button is pressed by a user and gets passed the MessageButton and ButtonInteraction instances  
> - `timeout` is emitted when the timeout of the BtnMsg, set in the settings object, is reached. After the timeout, the `.destroy()` method is automatically called  
> - `destroy` is emitted whenever the `.destroy()` method is called and it prompts the registry to deregister this BtnMsg instance. It gets passed an array of `MessageButton.customId`'s. After this event is emitted, all previously registered event listeners will be removed and will never receive evetns again.  

<br>

> ### PageEmbed
> This class is a wrapper for MessageEmbed that handles scrolling through multiple of them via MessageButtons.  
> It offers lots of configurability and dynamically changeable pages.  
>   
> #### Methods:
> - `sendIn()` sends this PageEmbed in the provided channel. If you want a custom message implementation, use `setMsg()` and `getMsg()`
> - `getMsgOpts()` returns properties that can be passed to a `channel.send()` or `(msg | int).reply()` method
> - `setPages()` is for dynamically changing the pages of the instance. If the current page index is out of range after the pages have changed, it gets lowered automatically.
> - `first()`, `prev()`, `next()` and `last()` can be used just like the users use the MessageButtons to navigate the PageEmbed.
> - `destroy()` edits the message to remove the buttons, emits the `destroy` event, removes all event listeners and deregisters the buttons
> - `updateMsg()` can be called to update the message on the Discord API with what's currently stored in the PageEmbed.
> - `setAllowAllUsers()` allows setting whether users other than the author can interact with the buttons
> - `askGoToPage()` opens a prompt in a channel to type the new page number to navigate to.
>   
> #### Events:
> Use `PageEmbed.on("name", (args) => {})` to subscribe to them
> - `press` is emitted whenever a button is pressed by a user and gets passed the ButtonInteraction instance and a string telling you which button was pressed.  
> - `timeout` is emitted when the timeout of the PageEmbed, set in the settings object, is reached. After the timeout, the `.destroy()` method is automatically called.
> - `destroy` is emitted whenever the `.destroy()` method is called.
> - `update` is emitted after the associated message on the Discord API has been edited.

<br>

> ### Modal
> The modal is a configurable form dialog that gets shown to a user.  
> Modals only work in the desktop client, not the mobile app.  
>   
> This is an abstract class, so you need to create a sub-class extending `Modal`
> 
> #### Methods:
> - `submit()` is executed when the user submitted the modal - this method needs to be overridden in a sub-class
> - `getInternalModal()` returns the modal object that needs to be passed to an interaction's `showModal()` method
> 
> #### Events:
> - `destroy` gets emitted when `.destroy()` is called to trigger the registry to delete this instance

<br>
