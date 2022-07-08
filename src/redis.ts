import { createClient } from "redis";

const client = createClient();

client.on("error", (err) => console.log("Redis Client Error", err));

// for some reason, this never gets called, but it should be according to the docs (kinda janky lib tbh)
client.on("connect", () => {
    console.log("\nRedis Client ready to send commands");
});

export function getRedis(): typeof client {
    return client;
}
