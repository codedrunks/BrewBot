import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

export class Stop extends Command {
    constructor() {
        super({
            name: "stop",
            desc: "Clears the queue and makes the bot leave the voice channel"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const guild = int.guild;

        if(!guild || !int.channel) return this.reply(int, embedify("This command cannot be used in DM's"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"), true);

        const manager = getManager();

        const player = manager.get(guild.id);

        if(!player) return this.reply(int, embedify("There is no music playing in this server"), true);

        if(voice !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel as the bot"), true);

        player.destroy();

        return this.reply(int, embedify("Cleared queue and left VC"));
    }
}
