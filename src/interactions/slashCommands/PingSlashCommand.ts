import { autoInjectable } from 'tsyringe';
import SlashCommand from '../SlashCommand';

@autoInjectable()
export default class PingSlashCommand extends SlashCommand {
    public constructor() {
        super();
        this.setName('ping');
        this.setDescription('sample slash command');
    }

    public async run(): Promise<void> {
        this.interaction.reply('test');
    }
}
