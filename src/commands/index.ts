import { Remove } from "./Remove";
import { Say } from "./Say";
import { ReactionRoles } from "./ReactionRoles";
import { Ping } from "./Ping";
import { Coinflip } from "./Coinflip";
import { ServerInfo } from "./ServerInfo";
import { Warn } from "./Warn";
import { Joke } from "./Joke";
import { Ferret } from "./Ferret";
import { Mock } from "./Mock";
import { Cheese } from "./Cheese";

/** Every command in here will get registered as soon as client is ready */
export const commands = [
    Remove,
    Say,
    ReactionRoles,
    Ping,
    Coinflip,
    ServerInfo,
    Warn,
    Joke,
    Ferret,
    Mock,
    Cheese,
];
