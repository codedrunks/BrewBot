## Table of contents
- [Development](#development)
    - [Project structure](#project-structure)
    - [Slash commands](#slash-commands)
    - [Other](#other)
- [CLI](#cli)
    - [General](#general)
    - [Prisma](#prisma)
- [Debugging](#debugging)
- [Discord API quirks](#discord-api-quirks)
- [Classes](#classes)
    - [BtnMsg](#btnmsg)

<br><br>

### Invite URL
```
https://discord.com/oauth2/authorize?client_id=__CLIENT_ID__&permissions=8&scope=bot%20applications.commands
```

<br>

## Development:
### Project structure:
Commands and events have template files in their respective folders called `Template.ts`, use these to create new commands and events.  
In order for a command or event to be initialized on startup, add it to the array of the `index.ts` file in the respective folder.

<br>

### Slash commands:
At the moment, `src/bot.ts` only sets guild-specific commands as these update pretty quickly (global commands take up to an hour to propagate).  
The regular Discord client doesn't update the locally saved slash commands when the bot restarts, so it's sometimes necessary to reload the Discord app with `Ctrl+R`  
If that still didn't work, or when you just want to remove a command or change its arguments, it's sometimes also necessary to delete them from Discord servers entirely.  
The bot inserts a fresh copy of all commands at next startup. To clear all global commands and guild commands, use `npm run clearCommands`

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

<br>

## CLI
### General
- `npm start` : start the bot regularly
- `npm run watch` : start the bot and watch for file changes to recompile automatically
- `npm run lint` : lints the code with eslint
- `npm run test` : runs the script at `src/test.ts`
- `npm run clearCommands` : clears all global and guild commands (takes a few minutes)

### Prisma
- `npx prisma migrate dev --name "describe_change_short"` : creates a database migration and updates the local database if there is one, use this everytime you update the schema.prisma file with a change
- `npx prisma migrate deploy` : this will deploy any changes to the local database, this is how you deploy migrations in production
- `npx prisma migrate reset` : this will reset the localdatabase and re-apply any migrations, use this in testing if you make breaking changes or need a reset
- `npx prisma migrate dev --create-only` : not usually needed, this will create a migration without applying it incase you need to manually change the SQL in the migration file
- `npx prisma format` : this formats the schema.prisma file and can also auto-complete foreign key association
- `npx prisma db seed` : this command seeds the database according to `prisma/seed.ts`

<br>

## Debugging
Debugging through VS Code works just fine, including breakpoints.  
Select "Launch" in the debugger pane, then press F5 to launch the debugger.  
Select the "test.ts" profile to debug the script at `src/test.ts`

<br>

## Discord API quirks
- (Sub)Command names and command option names need to be lowercase only with no spaces (underscores are fine).
- If you get **ANY** discord api related error then any changes that have been made to commands won't be registered until the error is fixed.

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
