import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export default abstract class SlashCommand extends SlashCommandBuilder {
    interaction: ChatInputCommandInteraction;

    setInteraction(interaction: ChatInputCommandInteraction): SlashCommand {
        this.interaction = interaction;
        return this;
    }

    abstract run(): Promise<void>;
}
