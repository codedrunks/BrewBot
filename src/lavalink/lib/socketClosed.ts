// import { embedify } from "@src/util";
// import { Client, TextChannel } from "discord.js";
// import { Player, WebSocketClosedEvent } from "erela.js";

// export function socketClosed(player: Player, payload: WebSocketClosedEvent, client: Client) { // eslint-disable-line
//     player.destroy();

//     console.log(payload);

//     if(!player.textChannel) return;

//     const channel = client.channels.cache.get(player.textChannel);

//     if(!channel) return;

//     (channel as TextChannel).send({
//         embeds: [
//             embedify("Forcefully disconnected from the voice channel, clearing queue")
//         ]
//     });
// }
