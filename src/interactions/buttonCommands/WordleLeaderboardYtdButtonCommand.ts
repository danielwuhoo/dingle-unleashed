import { container } from 'tsyringe';
import ButtonCommand from '../ButtonCommand';
import WordleService from '../../wordle/WordleService';
import { buildLeaderboardReply } from '../../wordle/WordleLeaderboardView';

export default class WordleLeaderboardYtdButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('wordleLeaderboardYtd');
    }

    public async run(): Promise<void> {
        await this.interaction.deferUpdate();
        const wordleService = container.resolve(WordleService);
        const leaderboard = wordleService.getLeaderboard('ytd', 10);
        const reply = buildLeaderboardReply(leaderboard, 'ytd');
        await this.interaction.editReply(reply);
    }
}
