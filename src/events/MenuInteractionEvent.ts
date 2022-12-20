import { ContextMenuCommandInteraction, Interaction } from 'discord.js';
import { container } from 'tsyringe';
import { Event } from '../common/types';
import MenuCommand from '../interactions/MenuCommand';
import MenuCommandRepository from '../repositories/MenuCommandRepository';

const CommandInteractionEvent: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isContextMenuCommand()) return;

        const menuCommandRepository: MenuCommandRepository = container.resolve(MenuCommandRepository);
        const command: MenuCommand = menuCommandRepository.getCommand(interaction.commandName);

        if (command) command.setInteraction(interaction as ContextMenuCommandInteraction).run();
    },
};

export default CommandInteractionEvent;
