export const GlobalQueue: Map<string, Queue> = new Map();

interface Queue {
    textChannelId: string,
    guildId: string,
    voiceChannelId: string,
    songs: any[], // eslint-disable-line
    playing: boolean,
    loop: boolean,
    skips: string[]
}
