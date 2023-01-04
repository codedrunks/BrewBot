import { Application } from "express";
import { respond } from "src/util";

export function initGuildSettings(app: Application) {
    // get current settings
    app.get("/guild/:guildId/settings", (req, res) => {
        respond(res, {
            guildId: "123",
            settings: {},
        });
    });

    // modify settings
    app.put("/guild/:guildId/settings", (req, res) => {
        void res;
    });

    // reset settings?
    // app.delete("/guild/:guildId/settings", (req, res) => {
    //     void res;
    // });
}
