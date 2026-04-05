import WordleBackfillOperation from '../../operations/WordleBackfillOperation';
import SlashCommand from '../SlashCommand';
import { wordleService, config, puzzleDataService } from '../../container';

export default class WordleBackfillSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('wordle-backfill');
        this.setDescription('Backfill historical Wordle results from the channel');
    }

    public async run(): Promise<void> {
        new WordleBackfillOperation(this.interaction, wordleService, config, puzzleDataService).run();
    }
}
