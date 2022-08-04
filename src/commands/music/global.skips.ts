import { Message, User } from "discord.js";

interface ISkip {
    amount: number;
    votes: number;
    initiator: User;
    skippers: Set<string>,
    lastMessage?: Message<boolean> | undefined,
}

export const skipVotes: Record<string, ISkip> = {};
