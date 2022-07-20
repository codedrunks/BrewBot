import { Client } from "discord.js";
import { Manager, NodeOptions, Plugin, Track, VoicePacket } from "erela.js";
import Spotify from "better-erela.js-spotify";
import { queueEnd } from "@src/lavalink/lib/queueEnd";
import { trackStart } from "@src/lavalink/lib/trackStart";
import { trackEnd } from "@src/lavalink/lib/trackEnd";
import { SpotifyOptions } from "better-erela.js-spotify/dist/typings";
import { playerMove } from "./lib/playerMove";
import { playerCreate } from "./lib/playerCreate";

let client: Client;
const plugins: Plugin[] = [];
let manager: Manager;

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

const spotifyOptions: SpotifyOptions = {};

if(clientId && clientSecret) {
    spotifyOptions.clientId = clientId;
    spotifyOptions.clientSecret = clientSecret;
    spotifyOptions.strategy = "API";
}

plugins.push(new Spotify(spotifyOptions));

const nodes: NodeOptions[] = [];

process.env.LAVALINK_HOSTS?.split(",").map((v) => {
    const [host, pass] = v.split(":");

    nodes.push({
        host: host,
        port: 2333,
        password: pass,
        retryDelay: 5000
    });
});


export function lavaRetrieveClient(cl: Client) {
    client = cl;

    manager = initializeManagerFromClient(client);
}

export function clientReadyInitLava(cl: Client) {
    manager.init(cl.user?.id);
}

export function clientUpdateVoiceStateLava(d: VoicePacket) {
    manager.updateVoiceState(d);
}

function initializeManagerFromClient(cl: Client): Manager {
    const manager = new Manager({
        nodes,
        send(id, payload) {
            const guild = cl.guilds.cache.get(id);
            if (guild) guild.shard.send(payload);
        },
        plugins,
        autoPlay: false
    });

    manager.on("nodeConnect", (node) => console.log(`\nNode ${node.options.identifier} connected.`))
        .on("trackStart", (player, track) => {
            trackStart(player, track, client);
        })
        .on("queueEnd", player => {
            queueEnd(player, client);
        })
        .on("trackEnd", (player, track, payload) => {
            trackEnd(player, track, payload, client);
        })
        .on("playerMove", (player, oldChannel, newChannel) => {
            playerMove(player, oldChannel, newChannel, client);
        })
        .on("playerCreate", (player) => {
            playerCreate(player, client);
        });

    return manager;
}

export function getMusicManager(): Manager {
    return manager;
}

export function reduceSongsLength(tracks: Track[]): number {
    return tracks.reduce((p, c) => p + c.duration, 0);
}

export const four_hours = 14_400_000;
