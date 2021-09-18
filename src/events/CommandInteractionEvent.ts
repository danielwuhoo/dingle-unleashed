import { Interaction } from 'discord.js';
import { container } from 'tsyringe';
import { Event } from '../common/types';
import Command from '../interactions/Command';
import CommandRepository from '../repositories/CommandRepository';

const CommandInteractionEvent: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isCommand()) return;

        const commandRepository: CommandRepository = container.resolve(CommandRepository);
        const command: Command = commandRepository.getCommand(interaction.commandName);

        if (command) command.run(interaction);
    },
};

export default CommandInteractionEvent;
