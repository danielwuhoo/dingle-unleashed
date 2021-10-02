import SkipOperation from '../../operations/SkipOperation';
import ButtonCommand from '../ButtonCommand';

export default class SkipButtonCommand extends ButtonCommand {
    public constructor() {
        super();
        this.setName('skip');
    }

    public async run(): Promise<void> {
        new SkipOperation(this.interaction).run();
    }
}
