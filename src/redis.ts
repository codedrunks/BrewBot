import { createClient } from "redis";

const client = createClient();

client.on("error", (err) => console.log("Redis Client Error", err));

client.on("connect", () => {
    console.log("\nRedis Client ready to send commands");
});

export function getRedis(): typeof client {
    return client;
}
