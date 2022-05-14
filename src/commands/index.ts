import { Remove } from "./Remove";
import { Say } from "./Say";
import { ReactionRoles } from "./ReactionRoles";
import { Uptime } from "./Uptime";
import { Ping } from "./Ping";

/** Every command in here will get registered as soon as client is ready */
export const commands = [
    Remove,
    Say,
    ReactionRoles,
    Uptime,
    Ping,
];
