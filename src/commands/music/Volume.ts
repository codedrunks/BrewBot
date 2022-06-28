import { CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { Command } from "@src/Command";
import { getManager } from "@src/lavalink/client";
import { embedify } from "@src/util";
import { isDJOnlyandhasDJRole } from "@database/music";

export class Volume extends Command {
    constructor() {
        super({
            name: "volume",
            desc: "Sets the volume of the bot (1-100)",
            category: "music",
            args: [
                {
                    name: "volume",
                    desc: "how loud the bot should play music (1-100)",
                    type: "number",
                    required: true
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {

        const args = this.resolveArgs(int);

        const guild = int.guild;

        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.reply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        const manager = getManager();

        const player = manager.get(guild.id);

        if(!player) return this.reply(int, embedify("The bot is not currently active in this server"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"));

        if(voice !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel as the bot"));

        const volume = Number(args.volume);

        if(!volume || volume < 1 || volume > 100) return this.reply(int, embedify("Volume must a number between 1 and 100"));

        player.setVolume(volume);

        return this.reply(int, embedify(`Player volume has been set to ${volume}%`));
    }
}
