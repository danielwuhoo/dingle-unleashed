import { ButtonInteraction, Interaction } from 'discord.js';
import { container } from 'tsyringe';
import { Event } from '../common/types';
import ButtonCommand from '../interactions/ButtonCommand';
import ButtonCommandRepository from '../repositories/ButtonCommandRepository';

const ButtonInteractionEvent: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isButton()) return;

        const buttonCommandRepository: ButtonCommandRepository = container.resolve(ButtonCommandRepository);
        const command: ButtonCommand = buttonCommandRepository.getCommand(interaction.customId);

        if (command) command.setInteraction(interaction as ButtonInteraction).run();
    },
};

export default ButtonInteractionEvent;
