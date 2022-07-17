import { Client } from "discord.js";
import { Player } from "erela.js";

export function playerCreate(player: Player, client: Client) { // eslint-disable-line
    setTimeout(() => {

        if(!player) return;

        if(!player.playing && !player.paused) player.destroy();
    }, 2000);
}
