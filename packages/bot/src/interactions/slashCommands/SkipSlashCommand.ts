import SkipOperation from '../../operations/SkipOperation';
import SlashCommand from '../SlashCommand';
import { audioSubscriptionRepository } from '../../container';

export default class SkipSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('skip');
        this.setDescription('Skips the track currently playing');
    }

    public async run(): Promise<void> {
        new SkipOperation(this.interaction, audioSubscriptionRepository).run();
    }
}
