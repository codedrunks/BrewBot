import { InitResourceFunc } from "../types/server";

// Guild
import { initGuildSettings } from "./guild/settings";

// User
import { initUserEcon } from "./user/economy";


export const initResourceFuncs: InitResourceFunc[] = [
    initUserEcon,
    initGuildSettings,
];
