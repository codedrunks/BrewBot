import { DeleteMessage } from "./DeleteMessage";
import { ResetNickname } from "./ResetNickname";

/** Every context menu in here will get registered when the bot starts up */
export const contextMenus = [
    // message
    DeleteMessage,

    // user
    ResetNickname,
];
