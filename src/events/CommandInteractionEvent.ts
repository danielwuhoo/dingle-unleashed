import { CommandInteraction, Interaction } from 'discord.js';
import { container } from 'tsyringe';
import { Event } from '../common/types';
import SlashCommand from '../interactions/SlashCommand';
import SlashCommandRepository from '../repositories/SlashCommandRepository';

const CommandInteractionEvent: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isCommand()) return;

        const commandRepository: SlashCommandRepository = container.resolve(SlashCommandRepository);
        const command: SlashCommand = commandRepository.getCommand(interaction.commandName);

        if (command) command.setInteraction(interaction as CommandInteraction).run();
    },
};

export default CommandInteractionEvent;
