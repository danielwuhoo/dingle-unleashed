import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export default abstract class SlashCommand extends SlashCommandBuilder {
    interaction: CommandInteraction;

    setInteraction(interaction: CommandInteraction): SlashCommand {
        this.interaction = interaction;
        return this;
    }

    abstract run(): Promise<void>;
}
