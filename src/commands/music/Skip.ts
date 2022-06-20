import { CommandInteraction } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

export class Skip extends Command {
    constructor() {
        super({
            name: "skip",
            desc: "Skip the currently playing song"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const guild = int.guild;
        
        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));
        
        const manager = getManager();

        const player = manager.get(guild.id);

        if(!player || !player.paused && !player.playing) return this.reply(int, embedify("There is no music playing in this server"), true);

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"), true);

        if(voice !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel with the bot"), true);

        const title = player.queue.current?.title;

        player.stop();
        return this.reply(int, embedify(`\`${title}\` was skipped`));
    }
}
