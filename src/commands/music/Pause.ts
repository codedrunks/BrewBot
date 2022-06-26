import { isDJOnlyandhasDJRole } from "../../database/music";
import { CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";

export class Pause extends Command {
    constructor() {
        super({
            name: "pause",
            desc: "Pause the currently playing song"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const manager = getManager();

        const player = manager.get(guild.id);

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.reply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        if(!player || !player.paused && !player.playing) return this.reply(int, embedify("There is no music playing in this server"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"));

        if(voice !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel as the bot"));

        if(player.paused && !player.playing) return this.reply(int, embedify("Music is already paused"));

        player.pause(true);

        return this.reply(int, embedify("Music paused"));
    }
}
