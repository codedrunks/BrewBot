import { createClient } from "redis";

const client = createClient();
let ready = false;

client.on("error", (err) => console.log("Redis Client Error", err));

// for some reason, this never gets called, but it should be according to the docs (kinda janky lib tbh)
client.on("connect", () => {
    console.log("\nRedis Client ready to send commands");

    ready = true;
});

export function getRedis(): typeof client | null {
    if(ready)
        return client;
    else return null;
}
