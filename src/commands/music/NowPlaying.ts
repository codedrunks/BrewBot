import { CommandInteraction, User } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

export class NowPlaying extends Command {
    constructor() {
        super({
            name: "nowplaying",
            desc: "Shows the current playing song"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's")); 

        const manager = getManager();

        const player = manager.get(guild.id);

        if(!player) return this.reply(int, embedify("There is no music playing in this server"));

        const current = player.queue.current;

        const embed = embedify(`Requested by: \`${(current?.requester as User).tag}\``)
            .setThumbnail(`https://img.youtube.com/vi/${current?.identifier}/mqdefault.jpg`)
            .setTitle(`${current?.title}\n${current?.author}`);

        return this.reply(int, embed);
    }
}
