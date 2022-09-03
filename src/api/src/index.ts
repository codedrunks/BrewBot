import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";

import { error } from "./error";
import { getCoins } from "@database/economy";

dotenv.config();

//#SECTION server setup

const { env } = process;

if(!env.API_PORT)
    error("Env var API_PORT is not set.", undefined, true);

const API_PORT = parseInt(String(env.API_PORT));
const app = express();

app.use(helmet());
// app.use(cors());
app.use(express.json());

//#SECTION server init

app.listen(API_PORT, () => {
    console.info(`Listening on port ${API_PORT}`);
});

app.get("/test", async (req, res) => {
    const { userId, guildId } = req.query as Record<string, string>;

    let coins;
    try
    {
        console.log(userId, guildId);
        coins = await getCoins(userId, guildId);
    }
    catch(err)
    {
        console.error(err);
        void err;
    }
    finally
    {
        if(coins)
            res.send({ coins });
        else
            res.send({ message: "Couldn't get coins" });
    }
});
