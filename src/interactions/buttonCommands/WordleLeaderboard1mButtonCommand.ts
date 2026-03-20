import { container } from 'tsyringe';
import ButtonCommand from '../ButtonCommand';
import WordleService from '../../wordle/WordleService';
import { buildLeaderboardReply } from '../../wordle/WordleLeaderboardView';

export default class WordleLeaderboard1mButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('wordleLeaderboard1m');
    }

    public async run(): Promise<void> {
        await this.interaction.deferUpdate();
        const wordleService = container.resolve(WordleService);
        const leaderboard = wordleService.getLeaderboard('1m', 10);
        const reply = buildLeaderboardReply(leaderboard, '1m');
        await this.interaction.editReply(reply);
    }
}
