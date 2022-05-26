import { Remove } from "./mod/Remove";
import { Say } from "./mod/Say";
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

/** Every command in here will get registered as soon as client is ready */
export const commands = [
    Remove,
    Say,
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
];
