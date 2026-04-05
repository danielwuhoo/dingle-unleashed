import { ChatInputCommandInteraction, Interaction } from 'discord.js';
import { Event } from '../common/types';
import SlashCommand from '../interactions/SlashCommand';
import { slashCommandRepository } from '../container';

const CommandInteractionEvent: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command: SlashCommand = slashCommandRepository.getCommand(interaction.commandName);

        if (command) command.setInteraction(interaction as ChatInputCommandInteraction).run();
    },
};

export default CommandInteractionEvent;
