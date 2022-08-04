import { User } from "discord.js";

interface ISkip {
    amount: number;
    votes: number;
    initiator: User;
    skippers: Set<string>
}

export const skipVotes: Record<string, ISkip> = {};
