import StopOperation from '../../operations/StopOperation';
import SlashCommand from '../SlashCommand';
import { audioSubscriptionRepository } from '../../container';

export default class StopSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('stop');
        this.setDescription('Stops and clears the audio queue');
    }

    public async run(): Promise<void> {
        new StopOperation(this.interaction, audioSubscriptionRepository).run();
    }
}
