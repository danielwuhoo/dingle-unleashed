import { ContextMenuCommandBuilder, ContextMenuCommandInteraction } from 'discord.js';

export default abstract class MenuCommand extends ContextMenuCommandBuilder {
    interaction: ContextMenuCommandInteraction;

    setInteraction(interaction: ContextMenuCommandInteraction): MenuCommand {
        this.interaction = interaction;
        return this;
    }

    abstract run(): Promise<void>;
}
