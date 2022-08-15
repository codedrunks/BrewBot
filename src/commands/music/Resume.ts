import { CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { Command } from "@src/Command";
import { getMusicManager } from "@src/lavalink/client";
import { embedify } from "@utils/embedify";
import { isDJOnlyandhasDJRole } from "@database/music";

export class Resume extends Command {
    constructor() {
        super({
            name: "resume",
            desc: "Resumes current song",
            category: "music"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.reply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        const manager = getMusicManager();
        
        const player = manager.get(guild.id);

        if(!player || !player.paused && !player.playing) return this.reply(int, embedify("There is no music playing in this server"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"));

        if(voice !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel as the bot"));

        if(!player.paused && player.playing) return this.reply(int, embedify("Music is already resumed"));

        player.pause(false);

        return this.reply(int, embedify("Music resumed"));
    }
}
