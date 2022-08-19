import { Cat } from "@commands/fun/Cat";
import { Cheese } from "@commands/fun/Cheese";
import { Chess } from "@src/commands/games/Chess";
import { Coinflip } from "@commands/fun/Coinflip";
import { Fact } from "@commands/fun/Fact";
import { Ferret } from "@commands/fun/Ferret";
import { HigherLower } from "@commands/games/HigherLower";
import { Joke } from "@commands/fun/Joke";
import { Mock } from "@commands/fun/Mock";
import { Steam } from "@src/commands/fun/Steam";
import { Sudoku } from "@commands/games/Sudoku";

// import { ReactionRoles } from "@commands/mod/ReactionRoles";
import { Delete } from "@commands/mod/Delete";
import { Log } from "@commands/mod/Log";
import { Say } from "@commands/mod/Say";
import { Warn } from "@commands/mod/Warn";

import { Avatar } from "@commands/util/Avatar";
import { Contest } from "@commands/fun/Contest/Contest";
import { Define } from "@commands/util/Define";
import { Emoji } from "@commands/util/Emoji";
import { Exec } from "@commands/util/Exec";
import { Help } from "@commands/util/Help";
import { Ping } from "@commands/util/Ping";
import { Reminder } from "@commands/util/Reminder";
import { Server } from "@commands/util/Server";
import { Translate } from "@commands/util/Translate";

import { Account } from "@src/commands/economy/Account";
import { Daily } from "@commands/economy/Daily";
import { Job } from "@commands/economy/Job";
import { SetBalance } from "@commands/economy/SetBalance";
import { Slots } from "@commands/games/Slots";
import { Work } from "@commands/economy/Work";

import { DJ } from "@commands/music/Dj";
import { Filter } from "@commands/music/Filter";
import { NowPlaying } from "@commands/music/NowPlaying";
import { Pause } from "@commands/music/Pause";
import { Play } from "@commands/music/Play";
import { Premium } from "@commands/music/Premium";
import { Queue } from "@commands/music/Queue";
import { Remove } from "@commands/music/Remove";
import { Repeat } from "@commands/music/Repeat";
import { Resume } from "@commands/music/Resume";
import { Search } from "@commands/music/Search";
import { Shuffle } from "@commands/music/Shuffle";
import { Skip } from "@commands/music/Skip";
import { Stop } from "@commands/music/Stop";
import { Volume } from "@commands/music/Volume";


/** Every command in here will get registered when the bot starts up */
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
    Slots,
    Steam,
    Sudoku,

    // mod
    // ReactionRoles,
    Delete,
    Log,
    Say,
    Warn,

    // util
    Avatar,
    Define,
    Emoji,
    Exec,
    Help,
    Ping,
    Reminder,
    Server,
    Translate,

    // Economy
    Account,
    Daily,
    Job,
    SetBalance,
    Work,

    // Music
    DJ,
    Filter,
    NowPlaying,
    Pause,
    Play,
    Premium,
    Queue,
    Remove,
    Repeat,
    Resume,
    Search,
    Shuffle,
    Skip,
    Stop,
    Volume,
];
