import TogglePauseOperation from '../../operations/TogglePauseOperation';
import ButtonCommand from '../ButtonCommand';
import { audioSubscriptionRepository } from '../../container';

export default class TogglePauseButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('togglePause');
    }

    public async run(): Promise<void> {
        new TogglePauseOperation(this.interaction, audioSubscriptionRepository).run();
    }
}
