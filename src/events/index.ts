import { Join } from "./Join";
import { Message } from "./Message";

/** Every command in here will get registered as soon as client is ready */
export const events = [
    Message,
    Join,
];
