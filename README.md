# BrewBot
The only Discord bot you'll ever need.  
BrewBot is your essential server companion with extensive moderation tools, fun games, an art contest system and various utility commands.  
  
This bot is still WIP. Please check back in a while :)

<!-- TODO: premium tier section -->

<br>

## Invite link:
Coming soon

<br>

## Feature overview:
- [contests with user submissions & voting](#contests)
- [singleplayer & multiplayer games](#games)
    - chess
    - sudoku
    - 2048
    - tic tac toe
- [economy](#economy)
    - jobs
- [moderation tools](#moderation-tools)
    - warning system
    - reaction roles
    - message logs
- [various utilities](#various-utilities)
    - set reminders
    - translate text
    - get a word's definition
    - let the bot tell you a joke
    - get detailed info about a steam profile

<br>

## Features (detailed):

### Contests:
> After configuring and starting a contest with `/contest start`, users can submit any file to it with `/contest submit`  
> As soon as the defined submission period ends, users can vote for submissions with `/contest vote`  
> After the voting period ends, the winner will be announced in the channel set with `/contest set_channel`  
> Run `/contest set_role` to set a role that will be pinged with contest updates.  
> Use `/contest current` or `/contest list` to view the currently active or all contests for the current server.

<br>

### Games:
> BrewBot has a few singleplayer and multiplayer games you can play in the chat.  
> Singleplayer games:
> - 2048 - `/2048 start`
> - Higher Lower - `/higherlower`
> - Slots (one-armed bandit) - `/slots`
> - Sudoku puzzle - `/sudoku start`
> 
> Multiplayer games:
> - Chess - `/chess start`
> 
> Multiplayer / AI Opponent games:
> - Tic Tac Toe - `/tictactoe start`

<br>

### Economy:
> You can sign up for a job with `/job` and work once every 4 hours with `/work` to earn coins.  
> Every 24 hours you can also run `/daily` for a daily bonus.  
> If you work enough times, you will be promoted to a job that offers better salary.  
> Once you have enough coins, you can bet them on the slots game with `/slots bet:<amount>`  
> Coins and job timers are unique per server and cannot be transferred between accounts or servers.

<br>

### Moderation tools:
> - Warning system:  
>     A moderator with the "manage members" permission can warn a member with the `/warning add` command.  
>     After a set threshold of warnings has passed, a message will be sent in a mod channel to suggest banning the account.  
>     Both of these can be configured in the [dashboard.](#TODO)
> - Reaction roles:  
>     TODO
> - Message logs:  
>     You can use `/log` to log the last n messages in the current channel to another channel.  
>     This is for keeping an evidence log and to capture the messages as they currently are, no matter if any are edited.

<br>

### Various utilities:
> - Set reminders
>     There are multiple ways of creating a reminder:  
>     - Start a timer from now by entering the delay with `/reminder set_timer`
>     - Set the reminder by providing a date and time in UTC with `/reminder set_date`
>     - Start a reminder that expires today by providing just the time in UTC with `/reminder set_time`
>     List your reminders with `/reminder list` and delete them with `/reminder delete`
> - Translate text
>     Translate any text to any language with the `/translate` command.  
>     The argument `input_language` will help if the text is too short and the language auto-detection fails.
> - Get a word's definition
>     The `/define` command can tell you the definition of a term from multiple sources using the `engine` argument.  
>     The available sources are: Wikipedia, Urban Dictionary and a regular dictionary.
> - Let the bot tell you a joke
>     Run `/joke` to let the bot tell you one or more jokes.
> - Get detailed info about a Steam profile
>      With `/steam info` you can look up the summary of a user's profile.  
>      `/steam games` shows a sortable list of games that a user owns and their playtime.  
>      Note that the `username` argument takes in the user's vanity URL which may be different from their current username or even nonexistent.
>      They also might have a private profile in which case either none or limited information is shown.
