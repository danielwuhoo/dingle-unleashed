import { ApplicationCommandType } from 'discord.js';
import PinMessageOperation from '../../operations/PinMessageOperation.js';
import MenuCommand from '../MenuCommand';

export default class PinMessageMenuCommand extends MenuCommand {
    public constructor() {
        super();
        this.setName('Pin Message');
        this.setType(ApplicationCommandType.Message);
    }

    public async run(): Promise<void> {
        new PinMessageOperation(this.interaction).run();
    }
}
