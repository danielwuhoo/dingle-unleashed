import { ButtonInteraction, Interaction } from 'discord.js';
import { Event } from '../common/types';
import ButtonCommand from '../interactions/ButtonCommand';
import { buttonCommandRepository } from '../container';

const ButtonInteractionEvent: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isButton()) return;

        const command: ButtonCommand = buttonCommandRepository.getCommand(interaction.customId);

        if (command) command.setInteraction(interaction as ButtonInteraction).run();
    },
};

export default ButtonInteractionEvent;
