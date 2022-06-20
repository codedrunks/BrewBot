import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

export class Shuffle extends Command {
    constructor() {
        super({
            name: "shuffle",
            desc: "Shuffles the queue"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const manager = getManager();
        const player = manager.get(guild.id);

        if(!player || !player.queue.current) return this.reply(int, embedify("There is no music playing in this server"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You are not in the voice channel"));

        player.queue.shuffle();

        return this.reply(int, embedify("Shuffled the queue"));
    }
}
