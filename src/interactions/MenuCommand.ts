import { ContextMenuInteraction } from 'discord.js';

export default abstract class MenuCommand {
    name: string;

    interaction: ContextMenuInteraction;

    setName(name: string): MenuCommand {
        this.name = name;
        return this;
    }

    setInteraction(interaction: ContextMenuInteraction): MenuCommand {
        this.interaction = interaction;
        return this;
    }

    abstract run(): Promise<void>;
}
