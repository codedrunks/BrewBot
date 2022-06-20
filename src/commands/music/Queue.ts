import { CommandInteraction, MessageButton, User } from "discord.js";
import { Command } from "../../Command";
import { getManager } from "../../lavalink/client";
import { embedify } from "../../util";
import { Queue as ErelaQueue, Track, UnresolvedTrack } from "erela.js";
import { BtnMsg } from "../../BtnMsg";

interface QueuePage {
    [userid: string]: number,
}

const pages: QueuePage = {};

let tracks: (Track | UnresolvedTrack)[];
const multiple = 10;

export class Queue extends Command {
    constructor() {
        super({
            name: "queue",
            desc: "Shows the current music queue"
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        try {

            await this.deferReply(int);

            const guild = int.guild;

            if(!guild) return this.editReply(int, embedify("This command cannot be used in DM's"));

            const manager = getManager();

            const player = manager.get(guild.id);

            if(!player || !player.queue.current) return this.editReply(int, embedify("There is no music playing this server"));

            pages[int.user.id] = 1;

            let page = pages[int.user.id];

            tracks = paginateTracks(page, player.queue, multiple);

            if(!tracks.length && !player.queue.current) return this.editReply(int, embedify("No tracks in the queue"));

            const embed = embedify(`Current: [${player.queue.current.title}](${player.queue.current.uri}) <@${(player.queue.current.requester as User).id}>\n\n${tracks.map((v, i) => `${((page - 1) * multiple) + (++i)}: [${v.title}](${v.uri}) <@${(v.requester as User).id}>`).join("\n")}`);

            if(player.queue.current.thumbnail) embed.setThumbnail(player.queue.current.thumbnail);

            if(player.queue.length > 10) {
                const btns: MessageButton[] = [
                    new MessageButton().setEmoji("⬅️").setLabel("Previous").setStyle("PRIMARY"),
                    new MessageButton().setEmoji("➡️").setLabel("Next").setStyle("PRIMARY")
                ];

                const button = new BtnMsg(embed, btns, { timeout: 20_000 });

                button.on("press", async (b, i) => { // eslint-disable-line

                    await i.deferUpdate();

                    if(!player || !player.queue.current) return;

                    if(b.label == "Previous") {
                        if(page !== 1) page--;

                        tracks = paginateTracks(page, player.queue, multiple);

                        embed.setDescription(`Current: [${player.queue.current.title}](${player.queue.current.uri}) <@${(player.queue.current.requester as User).id}>\n\n${tracks.map((v, i) => `${((page - 1) * multiple) + (++i)}: [${v.title}](${v.uri}) <@${(v.requester as User).id}>`).join("\n")}`);

                        int.editReply({ ...button.getReplyOpts(), embeds: [ embed ]});
                    } else if(b.label == "Next") {
                        const maxPage = Math.ceil(player.queue.length / multiple);
                        if(page < maxPage) page++;
                        // if(page * multiple > player.queue.length) page--;

                        tracks = paginateTracks(page, player.queue, multiple);

                        embed.setDescription(`Current: [${player.queue.current.title}](${player.queue.current.uri}) <@${(player.queue.current.requester as User).id}>\n\n${tracks.map((v, i) => `${((page - 1) * multiple) + (++i)}: [${v.title}](${v.uri}) <@${(v.requester as User).id}>`).join("\n")}`);

                        int.editReply({ ...button.getReplyOpts(), embeds: [ embed ]});
                    }
                });

                button.on("timeout", async () => {
                    delete pages[int.user.id];

                    await this.deleteReply(int);
                });

                await int.editReply({ ...button.getReplyOpts(), embeds: [ embed ]});
            } else {
                await this.editReply(int, embed);
            }
        } catch(e) {
            console.error(e);
        }
    }}

function paginateTracks(page: number, queue: ErelaQueue, multiple?: number): (Track | UnresolvedTrack)[] {
    multiple = multiple ?? 10;

    const end = page * multiple;
    const start = end - multiple;

    return queue.slice(start, end);
}
