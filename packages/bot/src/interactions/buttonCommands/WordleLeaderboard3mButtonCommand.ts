import ButtonCommand from '../ButtonCommand';
import { wordleService } from '../../container';
import { buildLeaderboardReply } from '../../wordle/WordleLeaderboardView';

export default class WordleLeaderboard3mButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('wordleLeaderboard3m');
    }

    public async run(): Promise<void> {
        await this.interaction.deferUpdate();
        const leaderboard = wordleService.getLeaderboard('3m', 10);
        const reply = buildLeaderboardReply(leaderboard, '3m');
        await this.interaction.editReply(reply);
    }
}
