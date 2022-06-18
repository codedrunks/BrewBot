import { Cat } from "./fun/Cat";
import { Cheese } from "./fun/Cheese";
import { Coinflip } from "./fun/Coinflip";
import { Fact } from "./fun/Fact";
import { Ferret } from "./fun/Ferret";
import { HigherLower } from "./games/HigherLower";
import { Joke } from "./fun/Joke";
import { Mock } from "./fun/Mock";
import { Steam } from "./fun/Steam";

import { Delete } from "./mod/Delete";
import { Log } from "./mod/Log";
// import { ReactionRoles } from "./mod/ReactionRoles";
import { Say } from "./mod/Say";
import { Warn } from "./mod/Warn";

import { Avatar } from "./util/Avatar";
import { Define } from "./util/Define";
import { Emoji } from "./util/Emoji";
import { Exec } from "./util/Exec";
import { Ping } from "./util/Ping";
import { Reminder } from "./util/Reminder";
import { Server } from "./util/Server";
import { Btn } from "./Btn";
import { Contest } from "./fun/Contest/Contest";

import { Balance } from "./economy/Balance";
import { OpenAccount } from "./economy/OpenAccount";
import { CloseAccount } from "./economy/CloseAccount";
import { SetBalance } from "./economy/SetBalance";
import { Daily } from "./economy/Daily";
import { Work } from "./economy/Work";
import { Job } from "./economy/Job";

import { Play } from "./music/Play";
import { Skip } from "./music/Skip";

/** Every command in here will get registered as soon as client is ready */
export const commands = [
    // fun
    Cat,
    Cheese,
    Coinflip,
    Contest,
    Fact,
    Ferret,
    HigherLower,
    Joke,
    Mock,
    Steam,

    // mod
    Delete,
    Log,
    // ReactionRoles,
    Say,
    Warn,

    // util
    Avatar,
    Define,
    Emoji,
    Exec,
    Ping,
    Reminder,
    Server,

    // Economy
    Balance,
    OpenAccount,
    CloseAccount,
    SetBalance,
    Daily,
    Work,
    Job,

    // Music
    Play,
    Skip,

    Btn, //#DEBUG
];
