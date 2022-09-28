import { Command } from "@src/Command";
import { embedify } from "@src/util";
import { CommandInteraction, EmbedField, Guild, Message, User } from "discord.js";
import { addCoins, getCoins, subCoins } from "@database/economy";

interface ICard {
    value: number;
    emote: string;
}

interface IPlayerData {
    name: string;
    id: string;
    hand: ICard[];
    bet: number;
}

interface IBlackJackGame {
    players: string[];
    started: boolean;
    playerData: Record<string, IPlayerData>;
    deck: ICard[];
    dealer: ICard[];
    lastMessage?: Message<boolean> | undefined;
    currentPlayer?: number;
    guildId: string;
    winner?: [string, number];
}

interface IBlackJack {
    games: Record<string, IBlackJackGame | undefined>;
}

const BlackJackCollection: Record<string, IBlackJack> = {};
const UsersMap: Record<string, string> = {};

const seedDeck: ICard[] = [
    { value: 1, emote: ":regional_indicator_a:" },
    { value: 2, emote: ":two:" },
    { value: 3, emote: ":three:" },
    { value: 4, emote: ":four:" },
    { value: 5, emote: ":five:" },
    { value: 6, emote: ":six:" },
    { value: 7, emote: ":seven:" },
    { value: 8, emote: ":eight:" },
    { value: 9, emote: ":nine:" },
    { value: 10, emote: ":keycap_ten:" },
    { value: 10, emote: ":regional_indicator_j:" },
    { value: 10, emote: ":regional_indicator_q:" },
    { value: 10, emote: ":regional_indicator_k:" }
];

const Deck: ICard[] = [];
for(let i = 0; i < 4; i++) {
    for(let j = 0; j < seedDeck.length; j++) {
        Deck.push(seedDeck[j]);
    }
}

export class BlackJack extends Command {
    constructor() {
        super({
            name: "blackjack",
            desc: "Simple blackjack card game, creates or joins active game in channel up to 7 players",
            category: "games",
            args: [
                {
                    name: "bet",
                    desc: "amount to bet",
                    type: "number",
                    min: 1,
                    required: true
                }
            ],
            allowDM: false
        });
    }

    async run(int: CommandInteraction): Promise<void> {
        await this.deferReply(int, true);

        const guild = int.guild!;
        const bet = int.options.getNumber("bet")!;

        if(int.user.id in UsersMap) return this.followUpReply(int, embedify("You are already in a game, finish it before playing another"), true);
        
        const currentBalance = await getCoins(int.user.id, guild.id);

        if(currentBalance! < bet) return this.followUpReply(int, embedify("You cannot afford to place this bet, try placing a smaller bet"), true);

        // [gameid, amount of players]
        let games: (string | number | boolean)[][] = [];

        if(!(guild.id in BlackJackCollection)) {
            BlackJackCollection[guild.id] = {
                games: {}
            };
        }

        for(const key in BlackJackCollection[guild.id].games) {
            const game = BlackJackCollection[guild.id].games[key]!;

            console.log(game);

            if(!game) {
                delete BlackJackCollection[guild.id].games[key];
                console.log(BlackJackCollection[guild.id].games[key]);
                continue;
            }

            if(game.players.length < 6 && !game.started) games.push([key, game.players.length]);
        }

        await subCoins(int.user.id, guild.id, bet);

        if(games.length > 0) {
            games = games.sort((a, b) => (a[1] as number) - (b[1] as number));

            const bestGame = BlackJackCollection[guild.id].games[games[0][0] as string]!;

            bestGame.players.push(int.user.id);
            bestGame.playerData[int.user.id] = {
                name: int.user.username,
                id: int.user.id,
                hand: [],
                bet: bet
            };
            UsersMap[int.user.id] = games[0][0] as string;

            return await this.followUpReply(int, embedify(`You have been added to <@${bestGame.players[0]}>'s game, wait for it to start`), true);
        } else {
            UsersMap[int.user.id] = `${guild.id}${int.user.id}`;

            BlackJackCollection[guild.id].games[`${guild.id}${int.user.id}`] = {
                players: [],
                started: false,
                playerData: {},
                deck: [],
                dealer: [],
                guildId: guild.id
            };

            const message = await int.channel?.send({ embeds: [ embedify(`<@${int.user.id}>\`(${bet} bet)\` has started a game of Blackjack, join in the next 20 seconds to play`) ]});
            const newGame = BlackJackCollection[guild.id].games[`${guild.id}${int.user.id}`]!;
            newGame.players.push(int.user.id);
            newGame.playerData[int.user.id] = {
                name: int.user.username,
                id: int.user.id,
                hand: [],
                bet: bet
            };

            this.gameLoop(int.user, guild, bet, message);

            return await this.followUpReply(int, embedify("Game creation successful"), true);
        }
    }

    /**
     * GAMEPLAN
     * 
     * distribute 2 cards per player, and 2 to dealer, one face down
     * 
     * one player at a time, expect input `hit` until input `stand`, user has 20 seconds to completely decide, stand will be automatically played after then, then to next player
     * 
     * after all players have played, reveal mystery dealer card, dealers hits until value is at minimum 18
     * 
     * all players who beat dealer are awarded 3:2
     */

    async gameLoop(player: User, guild: Guild, bet: number, startedMsg: Message<boolean> | undefined) { //eslint-disable-line
        setTimeout(async () => {

            const game = BlackJackCollection[guild.id].games[`${guild.id}${player.id}`]!;
            game.deck = game.deck.concat([...Deck]);

            game.dealer.push(takeItemMutArray<ICard>(game.deck), takeItemMutArray<ICard>(game.deck));

            for(let i = 0; i < game.players.length; i++) {
                game.playerData[game.players[i]].hand.push(takeItemMutArray<ICard>(game.deck), takeItemMutArray<ICard>(game.deck));
            }

            game.currentPlayer = 0;

            const embed = embedify(":clubs:**BlackJack**:diamonds:\n\nPlease respond with `hit` or `stand`");

            embed.addField("**Dealer**", `${game.dealer[0].emote}:question:`, false);

            for(let i = 0; i < game.players.length; i++) {
                const player = game.playerData[game.players[i]];

                embed.addField(`**${player.name}**`, `${player.hand.map(c => `${c.emote}`).join("")} | value: ${player.hand.reduce<number>((p, c) => p + c.value, 0)} | bet: ${player.bet}`, false)
                    .setFooter({
                        text: `${game.playerData[game.players[game.currentPlayer]].name}'s turn`
                    });
            }

            game.lastMessage = await startedMsg?.channel.send({ embeds: [embed] });
            await startedMsg?.delete();

            // start listening for plays `hit` and `stand`

            const collector = game.lastMessage?.channel.createMessageCollector();

            collector?.on("collect", async (m) => {
                if(m.author.id === game.players[game.currentPlayer!]) {
                    if(!["hit", "stand"].includes(m.content)) return;

                    game.lastMessage?.delete();


                    let over = false;
                    const player = game.playerData[game.players[game.currentPlayer!]];

                    m.delete();

                    if(m.content === "hit") {
                        const card = takeItemMutArray<ICard>(game.deck);
                        game.playerData[game.players[game.currentPlayer!]].hand.push(card);

                        if((this.reduceHand(player.hand)) >= 21) over = true;

                    } else if(m.content === "stand") {
                        over = true;
                    }

                    // if player is over 21 or stood, increment current player and then send new embed with new current player

                    if(over) {
                        game.currentPlayer!++;

                        // print out final embed with finish flag
                        // all players with score: > dealer win, == dealer draw, < dealer lose
                        // distribute coins accordingly, loss 0x, draw 1x, win 1.5x

                        if(game.currentPlayer! + 1 > game.players.length) {

                            collector.stop();

                            let dealerValue = this.reduceHand(game.dealer);

                            while(dealerValue < 18) {
                                const card = takeItemMutArray<ICard>(game.deck);

                                dealerValue += card.value;
                                game.dealer.push(card);
                            }

                            for(let i = 0; i < game.players.length; i++) {
                                const j = this.reduceHand(game.playerData[game.players[i]].hand);
                                if(j <= 21 && j > dealerValue) game.winner = [game.playerData[game.players[i]].id, j];
                            }

                            if(!game.winner) game.winner = ["dealer", dealerValue];

                            const finalEmbed = embedify(":clubs:**BlackJack**:diamonds:")
                                .addField("**Dealer**:checkered_flag:", `${game.dealer.map(c => `${c.emote}`).join("")}${dealerValue < game.winner[1] || dealerValue > 21 ? ":x:" : ":white_check_mark:"} | value: ${this.reduceHand(game.dealer)}`, false);

                            for(let i = 0; i < game.players.length; i++) {
                                const player = game.playerData[game.players[i]];
                                const playerValue = this.reduceHand(player.hand);

                                finalEmbed.addField(`**${player.name}**`, `${player.hand.map(c => `${c.emote}`).join("")}${playerValue > 21 || playerValue < game.winner[1] ? ":x:" : ":white_check_mark:"} | value: ${playerValue} | bet: ${player.bet}`);

                                if(playerValue === game.winner[1] && game.winner[0] !== "dealer" || player.id === game.winner[0]) await addCoins(player.id, game.guildId, player.bet + player.bet * 1.5);
                                else if(playerValue === game.winner[1] && game.winner[0] === "dealer") await addCoins(player.id, game.guildId, player.bet);

                                delete UsersMap[player.id];
                            }

                            game.lastMessage = await game.lastMessage?.channel.send({ embeds: [ finalEmbed ]});

                            BlackJackCollection[guild.id].games[`${guild.id}${player.id}`] = undefined;
                        } else {
                            const embed1 = embedify(":clubs:**BlackJack**:diamonds:\n\nPlease respond with `hit` or `stand`");

                            embed1.addField("**Dealer**", `${game.dealer[0].emote}:question:`, false)
                                .setFooter({
                                    text: `${game.playerData[game.players[game.currentPlayer!]].name}'s turn`
                                });

                            for(let i = 0; i < game.players.length; i++) {
                                const player = game.playerData[game.players[i]];
                
                                embed1.addField(`**${player.name}**`, `${player.hand.map(c => `${c.emote}`).join("")} | value: ${player.hand.reduce<number>((p, c) => p + c.value, 0)} | bet: ${player.bet}`, false);

                                game.lastMessage = await game.lastMessage?.channel.send({ embeds: [ embed1 ]});
                            }
                        }
                    } else {
                        const newFields: EmbedField[] = game.lastMessage?.embeds[0].fields as EmbedField[];

                        newFields.splice(game.currentPlayer! + 1, 1, {
                            name: `**${player.name}**`,
                            value: `${player.hand.map(c => `${c.emote}`).join("")} | value: ${this.reduceHand(player.hand)} | bet: ${player.bet}`,
                            inline: false
                        });

                        const newEmbed = embedify(":clubs:**BlackJack**:diamonds:\n\nPlease respond with `hit` or `stand`")
                            .addFields(...newFields)
                            .setFooter({ text: `${game.playerData[game.players[game.currentPlayer!]].name}'s turn`});

                        game.lastMessage = await game.lastMessage?.channel.send({ embeds: [ newEmbed ]});
                    }
                }
            });

        }, 1000 * 10);
    }

    reduceHand(hand: ICard[]): number {
        return hand.reduce<number>((p, c) => p + c.value, 0);
    }
}

// update to use svcorelib functions
function takeItemMutArray<T>(list: T[]) {
    const [item, idx] = randomItemIndex<T>(list);

    list = list.splice(idx, 1);

    return item;
}

function randomItemIndex<T>(list: T[]): [T, number] {
    const rIdx = Math.floor(Math.random() * list.length);
    
    return [list[rIdx], rIdx];
}
