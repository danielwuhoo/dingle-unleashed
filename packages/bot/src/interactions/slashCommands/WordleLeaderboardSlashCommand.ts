import WordleLeaderboardOperation from '../../operations/WordleLeaderboardOperation';
import SlashCommand from '../SlashCommand';
import { wordleService } from '../../container';

export default class WordleLeaderboardSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('wordle-leaderboard');
        this.setDescription('Shows the Wordle leaderboard');
    }

    public async run(): Promise<void> {
        new WordleLeaderboardOperation(this.interaction, wordleService).run();
    }
}
