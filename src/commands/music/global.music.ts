import { Message, User } from "discord.js";
import axios from "axios";

interface ISkip {
    amount: number;
    votes: number;
    initiator: User;
    skippers: Set<string>,
    lastMessage?: Message<boolean> | undefined,
}

export const skipVotes: Record<string, ISkip> = {};

export const filterTurnOff: Set<string> = new Set();

export async function fetchLyricsUrl(songName: string, artistName: string): Promise<string | undefined>
export async function fetchLyricsUrl(query: string): Promise<string | undefined>
export async function fetchLyricsUrl(...query: string[]): Promise<string | undefined>
{
    try
    {
        const [queryOrSong, artistName] = query.map(q => typeof q === "string" ? encodeURIComponent(q) : q);

        const { data, status } = await axios.get(`https://api.sv443.net/geniurl/search${
            artistName
                ? `?artist=${artistName}&song=${queryOrSong}`
                : `?q=${queryOrSong}`
        }`, {
            timeout: 1000 * 5
        });

        if(status < 200 || status > 300)
            return undefined;
        else
            return data?.top?.url;
    }
    catch(err)
    {
        return undefined;
    }
}
