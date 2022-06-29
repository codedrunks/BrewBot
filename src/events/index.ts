import { Message } from "@src/events/Message";
import { MemberJoin } from "@src/events/MemberJoin";
import { MemberLeave } from "@src/events/MemberLeave";
import { GuildJoined } from "@src/events/GuildJoined";

/** Every command in here will get registered as soon as client is ready */
export const events = [
    Message,
    MemberJoin,
    MemberLeave,
    GuildJoined,
];
