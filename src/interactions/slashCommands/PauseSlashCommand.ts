import { autoInjectable } from 'tsyringe';
import PauseOperation from '../../operations/PauseOperation';
import SlashCommand from '../SlashCommand';

@autoInjectable()
export default class PauseSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('pause');
        this.setDescription('Pauses the track currently playing');
    }

    public async run(): Promise<void> {
        new PauseOperation(this.interaction).run();
    }
}
