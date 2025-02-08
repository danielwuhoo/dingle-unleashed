import { CommandInteraction, ContextMenuCommandInteraction, MessageFlags } from 'discord.js';

export default class PinMessageOperation {
    interaction: CommandInteraction;

    public constructor(interaction: ContextMenuCommandInteraction) {
        this.interaction = interaction;
    }

    public async run(): Promise<void> {
        if (!this.interaction.isMessageContextMenuCommand()) return;

        if (this.interaction.targetMessage.pinned) {
            this.interaction.targetMessage.unpin();
            this.interaction.reply({
                content: 'Message unpinned',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            this.interaction.targetMessage.pin();
            this.interaction.reply({
                content: 'Message pinned',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}
