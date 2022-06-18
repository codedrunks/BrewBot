import { Client } from "discord.js";
import { Manager, Plugin, VoicePacket } from "erela.js";
import Spotify from "erela.js-spotify";
import { queueEnd } from "./lib/queueEnd";
import { trackStart } from "./lib/trackStart";

let client: Client;
const plugins: Plugin[] = [];
let manager: Manager;

const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if(clientID && clientSecret) {
    plugins.push(
        new Spotify({
            clientID,
            clientSecret
        })
    );
}

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
        nodes: [
            {
                host: "localhost",
                port: 2333,
                password: process.env.LAVALINK_PASSWORD ?? "youshallnotpass"
            }
        ],
        send(id, payload) {
            const guild = cl.guilds.cache.get(id);
            if (guild) guild.shard.send(payload);
        },
        plugins
    });

    manager.on("nodeConnect", (node) => console.log(`Node ${node.options.identifier} connected.`))
        .on("trackStart", (player, track) => {
            trackStart(player, track, client);
        })
        .on("queueEnd", player => {
            queueEnd(player, client);
        });

    return manager;
}

export function getManager(): Manager {
    return manager;
}
