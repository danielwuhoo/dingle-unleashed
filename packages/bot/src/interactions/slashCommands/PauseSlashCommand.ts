import PauseOperation from '../../operations/PauseOperation';
import SlashCommand from '../SlashCommand';
import { audioSubscriptionRepository } from '../../container';

export default class PauseSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('pause');
        this.setDescription('Pauses the track currently playing');
    }

    public async run(): Promise<void> {
        new PauseOperation(this.interaction, audioSubscriptionRepository).run();
    }
}
