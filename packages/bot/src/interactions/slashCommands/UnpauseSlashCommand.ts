import UnpauseOperation from '../../operations/UnpauseOperation';
import SlashCommand from '../SlashCommand';
import { audioSubscriptionRepository } from '../../container';

export default class UnpauseSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('unpause');
        this.setDescription('Unpauses the track currently playing');
    }

    public async run(): Promise<void> {
        new UnpauseOperation(this.interaction, audioSubscriptionRepository).run();
    }
}
