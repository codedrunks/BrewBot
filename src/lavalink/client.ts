import { Client } from "discord.js";
import { Manager } from "erela.js";
import Spotify from "erela.js-spotify"; // eslint-disable-line: TO BE IMPLEMENTED

export function initializeManagerFromClient(client: Client): Manager {
    return new Manager({
        nodes: [
            {
                host: "localhost",
                port: 2333,
                password: "pizzacat42"
            }
        ],
        send(id, payload) {
            const guild = client.guilds.cache.get(id);
            if(guild) guild.shard.send(payload);
        }
    })
        .on("nodeConnect", node => {
            console.log(`Node ${node.options.identifier} connected`);
        })
        .on("nodeDisconnect", (node, error) => {
            console.log(`Node ${node.options.identifier} had an error: ${error.reason}`);
        });
}
