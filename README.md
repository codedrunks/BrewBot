## Development:
To start normally, run `npm start`  
To watch for file changes to automatically recompile and restart, use `npm run watch`  
To lint the code run `npm run lint`  
  
Commands and events have template files in their respective folders called `Template.ts`, use these to create new commands and events.  
In order for a command or event to be initialized on startup, add it to the array of the `index.ts` file in the respective folder.  
  
At the moment, `src/bot.ts` only sets guild-specific commands as these update pretty quickly (global commands take up to an hour to propagate).  
The regular Discord client doesn't update the locally saved slash commands when the bot restarts, so it's sometimes necessary to reload the Discord app with `Ctrl+R`  
If that still didn't work, or when you just want to remove a command or change its arguments, it's sometimes also necessary to delete them from Discord servers entirely.  
The bot inserts a fresh copy of all commands at next startup. To clear all global commands and guild commands, use `npm run clearCommands`  

Some data persistence is still done through the `data.json` file, which is kept up by `src/persistentData.ts`. This will probably change. Prisma is the new database provider, please see usage below.

## Prisma Functions & Database Utils
There are some CLI functions for Prisma that the developer should be aware of when working with their database

__CLI__
- `npx prisma migrate dev --name "describe_change_short"` : creates a database migration and updates the local database if there is one, use this everytime you update the schema.prisma file with a change
- `npx prisma migrate deploy` : this will deploy any changes to the local database, this is how you deploy migrations in production
- `npx prisma migrate reset` : this will reset the localdatabase and re-apply any migrations, use this in testing if you make breaking changes or need a reset
- `npx prisma migrate dev --create-only` : not usually needed, this will create a migration without applying it incase you need to manually change the SQL in the migration file
- `npx prisma format` : this formats the schema.prisma file and can also auto-complete foreign key association

__Utils__<br />
All database utils can be found in `/src/database`, the functions are organized in files based on what part of the database they are associated with, i.e. all user related functions such as creating a new user or deleting a user are in `/src/database/users.ts`. When creating new utils, please follow this standard accordingly.

See prisma docs [here](https://www.prisma.io/docs/) and a reference to the node client library [here](https://www.prisma.io/docs/reference).

## Debugging
  
Debugging through VS Code works just fine, including breakpoints. Just press F5 to launch the debugger.  
  
Install these VS Code extensions for code auto-fix on save and special text highlighting:  
- `dbaeumer.vscode-eslint`
- `fabiospampinato.vscode-highlight`

## Discord API Quirks that you can't find anywhere
- (Sub)Command names and command option names need to be lowercase only with no spaces (underscores are fine).

<!-- mr bot invite: https://discord.com/oauth2/authorize?client_id=962824817038471178&permissions=8&scope=bot%20applications.commands -->

<br><br>

> ### `BtnMsg()` class
> To use the new message buttons, this class handles the communication between the `bot.ts` event listener and the slash command's scope.  
>   
> #### It has three constructor arguments:
> - `message` which is the message to attach the buttons to, in form of a string, MessageEmbed or an array of MessageEmbed's  
> - `buttons`, a single MessageButton instance or an array of them. **Don't set a `customId`** as the registry assigns own IDs automatically  
> - `options` where you can set a `timeout` in milliseconds, after which the `timeout` event gets emitted  
>   
> #### These are the emitted events:
> Use `BtnMsg.on("name", (args) => {})` to subscribe to them
> - `press` is emitted whenever the button is pressed by a user and gets passed the MessageButton and ButtonInteraction instances  
> - `timeout` is emitted when the timeout of the BtnMsg, set in the settings object, is reached. After the timeout, the `.destroy()` method is automatically called  
> - `destroy` is emitted whenever the `.destroy()` method is called and it prompts the registry to deregister this BtnMsg instance. It gets passed an array of `MessageButton.customId`'s. After this event is emitted, all previously registered event listeners will be removed and will never receive evetns again.  
