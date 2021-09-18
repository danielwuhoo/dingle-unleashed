import { CommandInteraction } from 'discord.js';
import { autoInjectable } from 'tsyringe';
import Command from '../Command';

@autoInjectable()
export default class PingCommand extends Command {
    public constructor() {
        super();
        this.setName('ping');
        this.setDescription('sample slash command');
    }

    public async run(interaction: CommandInteraction): Promise<void> {
        console.log(this.name);
        interaction.reply('test');
    }
}
