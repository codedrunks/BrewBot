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
  
Since I didn't wanna bother with SQL, for now all the persisting data is done through the `data.json` file, which is kept up by `src/persistentData.ts`  
Use the functions `get` and `set` of that file to get and set persistent data.  
  
Debugging through VS Code works just fine, including breakpoints. Just press F5 to launch the debugger.  
  
Install these VS Code extensions for code auto-fix on save and special text highlighting:  
- `dbaeumer.vscode-eslint`
- `fabiospampinato.vscode-highlight`

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
