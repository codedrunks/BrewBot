import { CommandInteraction, GuildMemberRoleManager } from "discord.js";
import { Command } from "@src/Command";
import { getMusicManager } from "@src/lavalink/client";
import { embedify } from "@src/util";
import { isDJOnlyandhasDJRole } from "@database/music";
import { skipVotes } from "./global.music";

export class Skip extends Command {
    constructor() {
        super({
            name: "skip",
            desc: "Skip the currently playing song",
            category: "music",
            args: [
                {
                    name: "amount",
                    desc: "amount of songs to skip, including current song"
                },
                {
                    name: "to",
                    desc: "song to skip to in queue"
                }
            ]
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        const args = this.resolveArgs(int);

        const amount = args.amount ? Number(args.amount) : 1;

        const to = args.to ? Number(args.to) : 0;

        const total = amount + to;

        const guild = int.guild;
        
        if(!guild) return this.reply(int, embedify("This command cannot be used in DM's"));

        const djcheck = await isDJOnlyandhasDJRole(guild.id, (int.member?.roles as GuildMemberRoleManager).cache);

        if(djcheck) return this.reply(int, embedify("Your server is currently set to DJ only, and you do not have a DJ role"));
        
        const manager = getMusicManager();

        const player = manager.get(guild.id);

        if(!player || !player.paused && !player.playing) return this.reply(int, embedify("There is no music playing in this server"), true);

        const voice = guild.members.cache.get(int.user.id)?.voice.channel;

        if(!voice) return this.reply(int, embedify("You must be in a voice channel to use this command"), true);

        if(voice.id !== player.voiceChannel) return this.reply(int, embedify("You must be in the same voice channel with the bot"), true);

        if(args.to && Math.abs(parseInt(args.to)) > player.queue.length || args.amount && Math.abs(parseInt(args.amount)) > player.queue.length) return this.reply(int, embedify("You cannot skip more than the length of the queue"), true);

        const title = player.queue.current?.title;

        // amount of people in VC minus bot
        const memberCount = voice.members.size - 1;

        if(memberCount == 1) {
            player.stop(args.to ? total - 1 : total);

            if(skipVotes[voice.id]) delete skipVotes[voice.id];

            return this.reply(int, embedify(total == 1 ? `\`${title}\` was skipped` : `${args.to ? total - 1 : total} tracks were skipped`));
        }
        
        if(!skipVotes[voice.id]) {
            skipVotes[voice.id]= {
                votes: 1,
                amount: args.to ? total - 1 : total,
                initiator: int.user,
                skippers: new Set([int.user.id])
            };
        } else {
            if(skipVotes[voice.id].skippers.has(int.user.id)) return this.reply(int, embedify("You already voted to skip"), true);
            
            skipVotes[voice.id].votes++;
            skipVotes[voice.id].skippers.add(int.user.id);
        }

        let remainingVotes: number;

        if(memberCount > 8) {
            skipVotes[voice.id].votes >= (Math.floor(memberCount * .5)) ? remainingVotes = 0 : remainingVotes = (Math.floor(memberCount * .5)) - skipVotes[voice.id].votes;
        } else if(memberCount >= 5) {
            skipVotes[voice.id].votes >= (Math.floor(memberCount * .6)) ? remainingVotes = 0 : remainingVotes = (Math.floor(memberCount * .6)) - skipVotes[voice.id].votes;
        } else {
            remainingVotes = skipVotes[voice.id].votes == 2 ? 0 : 1;
        }

        if(!djcheck) remainingVotes = 0;

        if(remainingVotes == 0) {
            player.stop(skipVotes[voice.id].amount);

            if(skipVotes[voice.id].lastMessage) {
                skipVotes[voice.id].lastMessage?.delete();
            }

            this.reply(int, embedify(skipVotes[voice.id].amount == 1 ? `\`${title}\` was skipped` : `${skipVotes[voice.id].amount} tracks were skipped`));

            delete skipVotes[voice.id];

            return;
        } else {
            this.reply(int, embedify("You voted to skip"), true);

            if(skipVotes[voice.id].lastMessage) {
                skipVotes[voice.id].lastMessage?.delete();
            }

            const msg = await int.channel?.send({ embeds: [ embedify(`<@${skipVotes[voice.id].initiator.id}> wants to skip${skipVotes[voice.id].amount > 1 ? ` to \`${player.queue.at(skipVotes[voice.id].amount - 1)?.title}\`` : ""}.\n\n${remainingVotes} more vote${remainingVotes == 1 ? "" : "s"} needed to skip.`) ]});

            skipVotes[voice.id].lastMessage = msg;
        }
    }
}
