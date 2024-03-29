import { Message, User } from "discord.js";
import { axios } from "@src/utils";
import { Track, UnresolvedTrack } from "erela.js";

interface ISkip {
    amount: number;
    votes: number;
    initiator: User;
    skippers: Set<string>,
    lastMessage?: Message<boolean> | undefined,
}

export interface SongInfo {
    url: string;
    path: string;
    meta: {
        title: string;
        fullTitle: string;
        artists: string;
        primaryArtist: {
            name: string;
            url: string;
        };
    };
    resources: {
        thumbnail: string;
        image: string;
    };
    lyricsState: string;
    id: number;
}

export const skipVotes: Record<string, ISkip> = {};

export const filterTurnOff: Set<string> = new Set();

/** Fetches song info by song and artist name or query. Now with server-side filtering for both! */
export async function fetchSongInfo(query: string | { song: string, artist: string }): Promise<SongInfo | undefined>
{
    /** geniURL fuzzy search threshold, lower = more strict, API default = 0.65 */
    const threshold = 0.3;
    try
    {
        /** Trim out stuff like `(Bunger Remix)` or `ft. DJ Bunger` */
        const sanitize = (str: string) => {
            const regexes = [
                /\(.*\)|\[.*\]/g,
                /ft\..+/g,
            ];

            for(const re of regexes)
                if(str.match(re))
                    str = str.replace(re, "");

            return str.trim();
        };

        let songOrQuery, artistName;

        if(typeof query === "object")
        {
            songOrQuery = encodeURIComponent(query.song);
            artistName = encodeURIComponent(query.artist);
        }
        else
            songOrQuery = encodeURIComponent(sanitize(query));

        const uri = `https://api.sv443.net/geniurl/search/top${
            artistName
                ? `?artist=${artistName}&song=${songOrQuery}`
                : `?q=${songOrQuery}`
        }&threshold=${threshold}`;

        const authorization = process.env["GENIURL_TOKEN"];

        const { data, status } = await axios.get(uri, {
            timeout: 1000 * 15,
            ...(authorization && authorization.length > 0
                ? { headers: { authorization } }
                : {}
            ),
        });

        if(status < 200 || status > 300)
            return undefined;
        else
            return data;
    }
    catch(err)
    {
        return undefined;
    }
}

/** Resolves a song title string to an artist and song name, or as a fallback to the original title string. */
export function resolveTitle(songTitle: string): { artist: string, song: string } | string
{
    if(songTitle.includes("-"))
    {
        // filter out the secondary artist(s)
        const artChars = "[&xv,]";

        // eslint-disable-next-line prefer-const
        let [ artist, song ] = songTitle.split("-").map(s => s.trim());

        if(artist.match(new RegExp(`^.*${artChars}.*`, "i")))
            artist = artist.split(new RegExp(artChars, "gi"))?.[0] ?? artist;

        return {
            artist,
            song,
        };
    }

    return songTitle;
}

export function formatTitle(track: Track | UnresolvedTrack, opts?: { monospace: boolean, link: boolean })
{
    const { monospace, link } = { ...({ monospace: true, link: true }), ...opts };
    const ms = monospace ? "`" : "";
    return link && track.uri ? `[${ms}${track.title}${ms}](${track.uri})` : `${ms}${track.title}${ms}`;
}
