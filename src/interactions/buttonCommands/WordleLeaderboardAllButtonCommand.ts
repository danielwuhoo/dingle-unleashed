import { container } from 'tsyringe';
import ButtonCommand from '../ButtonCommand';
import WordleService from '../../wordle/WordleService';
import { buildLeaderboardReply } from '../../wordle/WordleLeaderboardView';

export default class WordleLeaderboardAllButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('wordleLeaderboardAll');
    }

    public async run(): Promise<void> {
        await this.interaction.deferUpdate();
        const wordleService = container.resolve(WordleService);
        const leaderboard = wordleService.getLeaderboard('all', 10);
        const reply = buildLeaderboardReply(leaderboard, 'all');
        await this.interaction.editReply(reply);
    }
}
