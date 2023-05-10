import { ApplicationCommandOptionType, CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { Command } from "@src/Command";
import { getMusicManager } from "@src/lavalink/client";
import { embedify } from "@utils/embedify";
import { isDJOnlyandhasDJRole } from "@database/music";
import { settings } from "@src/settings";

export class Remove extends Command {
    constructor() {
        super({
            name: "remove",
            desc: "Remove a song from the queue",
            category: "music",
            args: [
                {
                    name: "song",
                    desc: "Song to remove from the queue, denoted by it's position in the queue",
                    type: ApplicationCommandOptionType.Number,
                    required: true,
                    min: 1
                }
            ]
        });

        this.enabled = settings.commands.musicEnabled;
    }

    async run(int: CommandInteraction): Promise<void> {

        const song = (int.options.get("song", true).value as number);

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

        if(song > player.queue.length) return this.reply(int, embedify("Can not remove a song that does not exist in the queue"));

        const removedName = player.queue[song - 1].title;

        player.queue.remove(song - 1);

        return this.reply(int, embedify(`Removed \`${removedName}\` from the queue`));
    }
}
