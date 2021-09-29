import { autoInjectable } from 'tsyringe';
import SkipOperation from '../../operations/SkipOperation';
import SlashCommand from '../SlashCommand';

@autoInjectable()
export default class SkipSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('skip');
        this.setDescription('Skips the track currently playing');
    }

    public async run(): Promise<void> {
        new SkipOperation(this.interaction).run();
    }
}
