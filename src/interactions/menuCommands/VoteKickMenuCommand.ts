import { ApplicationCommandType } from 'discord.js';
import VoteKickOperation from '../../operations/VoteKickOperation';
import MenuCommand from '../MenuCommand';

export default class VoteKickMenuCommand extends MenuCommand {
    public constructor() {
        super();
        this.setName('Vote Kick');
        this.setType(ApplicationCommandType.User);
    }

    public async run(): Promise<void> {
        new VoteKickOperation(this.interaction).run();
    }
}
