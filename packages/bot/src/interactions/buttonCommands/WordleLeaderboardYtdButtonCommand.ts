import ButtonCommand from '../ButtonCommand';
import { wordleService } from '../../container';
import { buildLeaderboardReply } from '../../wordle/WordleLeaderboardView';

export default class WordleLeaderboardYtdButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('wordleLeaderboardYtd');
    }

    public async run(): Promise<void> {
        await this.interaction.deferUpdate();
        const leaderboard = wordleService.getLeaderboard('ytd', 10);
        const reply = buildLeaderboardReply(leaderboard, 'ytd');
        await this.interaction.editReply(reply);
    }
}
