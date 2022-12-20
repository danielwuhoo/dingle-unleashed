import { ContextMenuCommandInteraction } from 'discord.js';

export default abstract class MenuCommand {
    name: string;

    interaction: ContextMenuCommandInteraction;

    setName(name: string): MenuCommand {
        this.name = name;
        return this;
    }

    setInteraction(interaction: ContextMenuCommandInteraction): MenuCommand {
        this.interaction = interaction;
        return this;
    }

    abstract run(): Promise<void>;
}
