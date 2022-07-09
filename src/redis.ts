import { createClient } from "redis";

const client = createClient();

client.on("error", (err) => { 
    if(err.code == "ECONNREFUSED") {
        console.error(`Cannot connect to redis instance at ${err.address}:${err.port}, is it running?`);
        process.exit(1);
    }
});

client.on("connect", () => {
    console.log("\nRedis Client ready to send commands");
});

export function getRedis(): typeof client {
    return client;
}
