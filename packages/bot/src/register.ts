import dotenv from 'dotenv';

dotenv.config();

import { REST, Routes } from 'discord.js';
import { slashCommandRepository, menuCommandRepository, config } from './container';

(async () => {
    await slashCommandRepository.init();
    await menuCommandRepository.init();

    const allCommands = [
        ...Object.values(slashCommandRepository.commands).map((c) => c.toJSON()),
        ...Object.values(menuCommandRepository.commands).map((c) => c.toJSON()),
    ];

    const rest = new REST({ version: '9' }).setToken(config.token);
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body: allCommands,
    });

    console.log('Registered commands:', allCommands.map((c) => c.name));
    console.log('Successfully reloaded application (/) commands.');
})();
