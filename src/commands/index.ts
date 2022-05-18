import { Remove } from "./Remove";
import { Say } from "./Say";
import { ReactionRoles } from "./ReactionRoles";
import { Ping } from "./Ping";
import { Coinflip } from "./Coinflip";
import { Server } from "./Server";
import { Warn } from "./Warn";
import { Joke } from "./Joke";
import { Ferret } from "./Ferret";
import { Mock } from "./Mock";
import { Cheese } from "./Cheese";
import { Cat } from "./Cat";
import { Reminder } from "./Reminder";

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
];
