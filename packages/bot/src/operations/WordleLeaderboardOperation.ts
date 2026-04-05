import { ChatInputCommandInteraction } from 'discord.js';
import WordleService from '../wordle/WordleService';
import { buildLeaderboardReply } from '../wordle/WordleLeaderboardView';

export default class WordleLeaderboardOperation {
    public constructor(
        readonly interaction: ChatInputCommandInteraction,
        readonly wordleService: WordleService,
    ) {}

    public async run(): Promise<void> {
        const leaderboard = this.wordleService.getLeaderboard('3m', 10);

        if (leaderboard.length === 0) {
            await this.interaction.reply({ content: 'No Wordle results yet!', ephemeral: true });
            return;
        }

        const reply = buildLeaderboardReply(leaderboard, '3m');
        await this.interaction.reply(reply);
    }
}
