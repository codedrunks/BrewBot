import { Delete } from "./mod/Delete";
import { Say } from "./mod/Say";
import { Log } from "./Log";
import { ReactionRoles } from "./mod/ReactionRoles";
import { Ping } from "./util/Ping";
import { Coinflip } from "./fun/Coinflip";
import { Server } from "./util/Server";
import { Warn } from "./mod/Warn";
import { Joke } from "./fun/Joke";
import { Ferret } from "./fun/Ferret";
import { Mock } from "./fun/Mock";
import { Cheese } from "./fun/Cheese";
import { Cat } from "./fun/Cat";
import { Reminder } from "./util/Reminder";
import { Avatar } from "./util/Avatar";
import { Define } from "./util/Define";
import { Fact } from "./fun/Fact";
import { Btn } from "./mod/Btn";
import { Steam } from "./fun/Steam";

/** Every command in here will get registered as soon as client is ready */
export const commands = [
    Delete,
    Say,
    Log,
    ReactionRoles,
    Ping,
    Coinflip,
    Server,
    Warn,
    Joke,
    Ferret,
    Mock,
    Cheese,
    Cat,
    Reminder,
    Avatar,
    Define,
    Fact,
    Btn,
    Steam,
];
