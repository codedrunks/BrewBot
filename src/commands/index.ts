import { Cat } from "@commands/fun/Cat";
import { Cheese } from "@commands/fun/Cheese";
import { Chess } from "@src/commands/games/Chess";
import { Coinflip } from "@commands/fun/Coinflip";
import { Fact } from "@commands/fun/Fact";
import { Ferret } from "@commands/fun/Ferret";
import { HigherLower } from "@commands/games/HigherLower";
import { Joke } from "@commands/fun/Joke";
import { Mock } from "@commands/fun/Mock";
import { Sudoku } from "@commands/games/Sudoku";

import { Delete } from "@commands/mod/Delete";
import { Log } from "@commands/mod/Log";
// import { ReactionRoles } from "@commands/mod/ReactionRoles";
import { Say } from "@commands/mod/Say";
import { Warn } from "@commands/mod/Warn";

import { Avatar } from "@commands/util/Avatar";
import { Define } from "@commands/util/Define";
import { Emoji } from "@commands/util/Emoji";
import { Exec } from "@commands/util/Exec";
import { Ping } from "@commands/util/Ping";
import { Reminder } from "@commands/util/Reminder";
import { Server } from "@commands/util/Server";
import { Steam } from "@src/commands/util/Steam";
import { Translate } from "@commands/util/Translate";
import { Help } from "@commands/util/Help";
import { Contest } from "@commands/fun/Contest/Contest";

import { Account } from "@src/commands/economy/Account";
import { SetBalance } from "@commands/economy/SetBalance";
import { Daily } from "@commands/economy/Daily";
import { Work } from "@commands/economy/Work";
import { Job } from "@commands/economy/Job";
import { Slots } from "@commands/games/Slots";

import { Play } from "@commands/music/Play";
import { Skip } from "@commands/music/Skip";
import { NowPlaying } from "@commands/music/NowPlaying";
import { Stop } from "@commands/music/Stop";
import { Resume } from "@commands/music/Resume";
import { Pause } from "@commands/music/Pause";
import { Search } from "@commands/music/Search";
import { Queue } from "@commands/music/Queue";
import { Shuffle } from "@commands/music/Shuffle";
import { Repeat } from "@commands/music/Repeat";
import { Volume } from "@commands/music/Volume";
import { DJ } from "@commands/music/Dj";
import { Premium } from "@commands/music/Premium";
import { Remove } from "@commands/music/Remove";
import { Filter } from "@commands/music/Filter";


/** Every command in here will get registered as soon as client is ready */
export const commands = [
    // fun
    Cat,
    Cheese,
    Chess,
    Coinflip,
    Contest,
    Fact,
    Ferret,
    HigherLower,
    Joke,
    Mock,
    Steam,
    Slots,
    Sudoku,

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
    Translate,
    Help,

    // Economy
    Account,
    SetBalance,
    Daily,
    Work,
    Job,

    // Music
    Play,
    Skip,
    NowPlaying,
    Stop,
    Resume,
    Pause,
    Search,
    Queue,
    Shuffle,
    Repeat,
    Volume,
    DJ,
    Premium,
    Remove,
    Filter
];
