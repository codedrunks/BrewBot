import { Message } from "@src/events/Message";
import { MemberJoin } from "@src/events/MemberJoin";
import { MemberLeave } from "@src/events/MemberLeave";
import { GuildJoined } from "@src/events/GuildJoined";

/** Every event in here will get registered when the bot starts up */
export const events = [
    Message,
    MemberJoin,
    MemberLeave,
    GuildJoined,
];
