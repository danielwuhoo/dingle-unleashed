import { SlashCommandStringOption } from '@discordjs/builders';
import { autoInjectable } from 'tsyringe';
import PlayOperation from '../../operations/PlayOperation';
import SlashCommand from '../SlashCommand';

@autoInjectable()
export default class PlaySlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('play');
        this.setDescription('Plays a track');
        this.addStringOption(new SlashCommandStringOption().setName('query').setDescription('a query string or url'));
    }

    public async run(): Promise<void> {
        new PlayOperation(this.interaction).run();
    }
}
