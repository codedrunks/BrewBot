## BrewBot API
#### Express-based REST API to interface with [BrewBot](https://github.com/codedrunks/BrewBot)

<br>

## Resources
- [Guild](#guild)
    - [ ] [Guild settings](#guild-settings)
    - [ ] [Premium tier](#premium-tier)
    - [ ] [Reaction roles](#reaction-roles)
    - [ ] [Guild warnings](#guild-warnings)
    - [ ] [Contest](#contest)
- [User profile](#user-profile)
    - [ ] [Account balances](#account-balances)
    - [ ] [User warnings](#user-warnings)
    - [ ] [Reminders](#reminders)

<br>

## TODO:
- Figure out how to authenticate moderators of guilds (maybe OAuth or querying the bot process via RPC or something idk)

<br><br>

## Guild
### Guild Settings
```
GET /guild/:guildId/settings
```
Returns the entire settings object for a guild

```
PUT /guild/:guildId/settings
```
Overwrites the entire settings object for a guild

<br><br>

## User profile
### Account balances
```
GET /user/:userId/balances
```
Returns a user's balances from all guilds

```
GET /user/:userId/balance/:guildId
```
Returns a user's balance from a specific guild