import { Command } from "@src/Command";
import { getPremium, isDJOnlyandhasDJRole } from "@src/database/music";
import { getMusicManager } from "@src/lavalink/client";
import { embedify } from "@src/utils";
import { ApplicationCommandOptionType, CommandInteraction, Guild, GuildMemberRoleManager } from "discord.js";
import { Player } from "erela.js";
import { filterTurnOff } from "./global.music";

export class Filter extends Command {
    constructor() {
        super({
            name: "filter",
            desc: "Set a filter on top of the music",
            category: "music",
            args: [
                {
                    name: "filter_type",
                    type: ApplicationCommandOptionType.String,
                    desc: "Filter to apply",
                    required: true,
                    choices: [
                        {
                            name: "none",
                            value: "none"
                        },
                        {
                            name: "bassboost",
                            value: "bassboost"
                        }
                    ]
                },
                {
                    name: "repeat",
                    type: ApplicationCommandOptionType.String,
                    desc: "Keep filter for one song or turn on until turned off",
                    required: true,
                    choices: [
                        {
                            name: "one_song",
                            value: "one_song"
                        },
                        {
                            name: "until_turned_off",
                            value: "until_turned_off"
                        }
                    ]
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        await this.deferReply(int);

        const filterType = int.options.get("filter_type", true).value as string;
        const repeat = int.options.get("repeat", true).value as string;

        const guild = int.guild;

        if(!guild || !int.channel) return this.followUpReply(int, embedify("This command cannot be used in DM's"));

        const premium = await getPremium(guild.id);

        if(!premium) return this.followUpReply(int, embedify("Please purchase premium to use this feature"));

        const djCheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djCheck) return this.followUpReply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));

        const manager = getMusicManager();
        const player = manager.get(guild.id);

        if(!player || !player.queue.current) return this.followUpReply(int, embedify("There is no music playing in this server"));

        const voice = guild.members.cache.get(int.user.id)?.voice.channel?.id;

        if(!voice) return this.followUpReply(int, embedify("You must be in a voice channel to use this command"));

        this.setFilter(player, guild, filterType);

        if(repeat === "one_song") {
            filterTurnOff.add(guild.id);
        }

        return this.followUpReply(int, embedify(`Filter \`${filterType}\` being applied`));
    }

    setFilter(player: Player, guild: Guild, filter: string) {
        switch(filter) {
        case "none":
            player.node.send({
                op: "filters",
                guildId: guild.id
            });
            break;
        case "bassboost":
            player.node.send({
                op: "filters",
                guildId: guild.id,
                equalizer: [
                    { band: 0, gain: 0.2 },
                    { band: 1, gain: 0.15 },
                    { band: 2, gain: 0.1 },
                    { band: 3, gain: 0.05 },
                    { band: 4, gain: 0.0 },
                    { band: 5, gain: 0.05 },
                    { band: 6, gain: -0.1 },
                    { band: 7, gain: -0.1 },
                    { band: 8, gain: -0.1 },
                    { band: 9, gain: -0.1 },
                    { band: 10, gain: -0.1 },
                    { band: 11, gain: -0.1 },
                    { band: 12, gain: -0.1 },
                    { band: 13, gain: -0.1 },
                    { band: 14, gain: -0.1}
                ]
            });
            break;
        }
    }
}
