import { Message } from "./Message";
import { MemberJoin } from "./MemberJoin";
import { MemberLeave } from "./MemberLeave";
import { GuildJoined } from "./GuildJoined";

/** Every command in here will get registered as soon as client is ready */
export const events = [
    Message,
    MemberJoin,
    MemberLeave,
    GuildJoined,
];
