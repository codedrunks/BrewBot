import { Remove } from "./Remove";
import { Say } from "./Say";

/** Every command in here will get registered as soon as client is ready */
export const commands = [
    Remove,
    Say,
];
