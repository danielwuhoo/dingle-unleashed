import { SlashCommandBuilder } from '@discordjs/builders';
import { Interaction } from 'discord.js';

export default abstract class Command extends SlashCommandBuilder {
    abstract run(interaction: Interaction): Promise<void>;
}
