import { ButtonInteraction } from 'discord.js';

export default abstract class ButtonCommand {
    name: string;

    interaction: ButtonInteraction;

    setName(name: string): ButtonCommand {
        this.name = name;
        return this;
    }

    setInteraction(interaction: ButtonInteraction): ButtonCommand {
        this.interaction = interaction;
        return this;
    }

    abstract run(): Promise<void>;
}
