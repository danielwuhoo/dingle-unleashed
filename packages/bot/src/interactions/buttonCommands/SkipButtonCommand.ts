import SkipOperation from '../../operations/SkipOperation';
import ButtonCommand from '../ButtonCommand';
import { audioSubscriptionRepository } from '../../container';

export default class SkipButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('skip');
    }

    public async run(): Promise<void> {
        new SkipOperation(this.interaction, audioSubscriptionRepository).run();
    }
}
