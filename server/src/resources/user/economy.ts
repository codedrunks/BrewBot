import { Application } from "express";
import { respond } from "src/util";

export function initUserEcon(app: Application) {
    app.get("/user/:userId/balances", (req, res) => {
        respond(res, {
            balances: [{ guildId: "123", balance: 69.99 }],
        });
    });

    app.get("/user/:userId/balance/:guildId", (req, res) => {
        respond(res, { guildId: "123", balance: 69.99 });
    });
}
