import { DeleteBelow } from "./DeleteBelow";
import { Emoji } from "./Emoji";

import { ResetNickname } from "./ResetNickname";


/** Every context menu in here will get registered when the bot starts up */
export const contextMenus = [
    // message
    DeleteBelow,
    Emoji,

    // user
    ResetNickname,
];
