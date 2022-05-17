import { Remove } from "./Remove";
import { Say } from "./Say";
import { ReactionRoles } from "./ReactionRoles";
import { Ping } from "./Ping";
import { Coinflip } from "./Coinflip";

/** Every command in here will get registered as soon as client is ready */
export const commands = [
    Remove,
    Say,
    ReactionRoles,
    Ping,
    Coinflip,
];
