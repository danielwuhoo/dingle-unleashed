import { CommandInteraction, ContextMenuCommandInteraction } from 'discord.js';

export default class PinMessageOperation {
    interaction: CommandInteraction;

    public constructor(interaction: ContextMenuCommandInteraction) {
        this.interaction = interaction;
    }

    public async run(): Promise<void> {
        if (!this.interaction.isMessageContextMenuCommand()) return;

        this.interaction.targetMessage.pin();
    }
}
