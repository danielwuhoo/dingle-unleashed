import { autoInjectable } from 'tsyringe';
import UnpauseOperation from '../../operations/UnpauseOperation';
import SlashCommand from '../SlashCommand';

@autoInjectable()
export default class UnpauseSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('unpause');
        this.setDescription('Unpauses the track currently playing');
    }

    public async run(): Promise<void> {
        new UnpauseOperation(this.interaction).run();
    }
}
