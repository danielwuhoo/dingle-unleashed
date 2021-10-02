import StopOperation from '../../operations/StopOperation';
import ButtonCommand from '../ButtonCommand';

export default class StopButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('stop');
    }

    public async run(): Promise<void> {
        new StopOperation(this.interaction).run();
    }
}
