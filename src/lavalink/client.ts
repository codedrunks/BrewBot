import { Client } from "discord.js";
import { Manager, NodeOptions, Plugin, VoicePacket } from "erela.js";
import Spotify from "better-erela.js-spotify";
import { queueEnd } from "@src/lavalink/lib/queueEnd";
import { trackStart } from "@src/lavalink/lib/trackStart";

let client: Client;
const plugins: Plugin[] = [];
let manager: Manager;

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if(clientId&& clientSecret) {
    plugins.push(
        new Spotify({
            clientId,
            clientSecret
        })
    );
}

const nodes: NodeOptions[] = [];

process.env.LAVALINK_HOSTS?.split(",").map((v) => {
    const [host, pass] = v.split(":");

    nodes.push({
        host: host,
        port: 2333,
        password: pass
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
        plugins
    });

    manager.on("nodeConnect", (node) => console.log(`\nNode ${node.options.identifier} connected.`))
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
