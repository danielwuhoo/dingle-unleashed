import { autoInjectable } from 'tsyringe';
import StopOperation from '../../operations/StopOperation';
import SlashCommand from '../SlashCommand';

@autoInjectable()
export default class StopSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('stop');
        this.setDescription('Stops and clears the audio queue');
    }

    public async run(): Promise<void> {
        new StopOperation(this.interaction).run();
    }
}
