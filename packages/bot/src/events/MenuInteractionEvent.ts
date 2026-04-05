import { ContextMenuCommandInteraction, Interaction } from 'discord.js';
import { Event } from '../common/types';
import MenuCommand from '../interactions/MenuCommand';
import { menuCommandRepository } from '../container';

const CommandInteractionEvent: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isContextMenuCommand()) return;

        const command: MenuCommand = menuCommandRepository.getCommand(interaction.commandName);

        if (command) command.setInteraction(interaction as ContextMenuCommandInteraction).run();
    },
};

export default CommandInteractionEvent;
