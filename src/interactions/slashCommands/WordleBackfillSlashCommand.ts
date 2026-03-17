import { autoInjectable } from 'tsyringe';
import WordleBackfillOperation from '../../operations/WordleBackfillOperation';
import SlashCommand from '../SlashCommand';

@autoInjectable()
export default class WordleBackfillSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('wordle-backfill');
        this.setDescription('Backfill historical Wordle results from the channel');
    }

    public async run(): Promise<void> {
        new WordleBackfillOperation(this.interaction).run();
    }
}
