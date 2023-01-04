import compression from "compression";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import k from "kleur";
import cors from "cors";
import dotenv from "dotenv";

import { getAuthTokens } from "./auth";
import { getEnvVar, respond } from "./util";
import { initResourceFuncs } from "./resources";

dotenv.config();

const app = express();
const authTokens = getAuthTokens();

app.use(cors({
    methods: "GET,POST,PUT,DELETE",
    origin: getEnvVar("CORS_ORIGIN", "stringNoEmpty") ?? "*",
}));
app.use(helmet());
app.use(express.json());
app.use(compression());

app.disable("x-powered-by");

async function init() {
    const port = getEnvVar("HTTP_PORT", "number");
    const hostRaw = String(process.env.HTTP_HOST ?? "").trim();
    const host = hostRaw.length < 1 ? "0.0.0.0" : hostRaw;

    if(!port)
        throw new TypeError("Env var HTTP_PORT is not defined or invalid");

    // check auth
    app.use((req: Request, res: Response, next: NextFunction) => {
        const { authorization } = req.headers;
        const authHeader = authorization?.startsWith("Bearer ") ? authorization.substring(7) : authorization;

        if(!authHeader || !authTokens.has(authHeader))
            return res.status(401).send({ error: true, message: "Unauthorized" });
        else
            return next();
    });

    // on error
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
        if(typeof err === "string" || err instanceof Error)
            return respond(res, `General server error: ${err.toString()}`, "serverError");
        else
            return next();
    });

    const listener = app.listen(port, host, () => {
        for(const initFunc of initResourceFuncs)
            initFunc(app);

        console.log(k.green(`Listening on ${host}:${port}`));
    });

    listener.on("error", (err) => {
        console.error(`${k.red("General server error:")}\n${err}\n`);
        process.exit(1);
    });
}

init();
