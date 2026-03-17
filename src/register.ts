import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';
import SlashCommandRepository from './repositories/SlashCommandRepository';
import DingleConfig from './models/DingleConfig';
import MenuCommandRepository from './repositories/MenuCommandRepository';

dotenv.config();

const commandRepository: SlashCommandRepository = container.resolve(SlashCommandRepository);
const menuCommandRepository: MenuCommandRepository = container.resolve(MenuCommandRepository);
const config: DingleConfig = container.resolve(DingleConfig);

(async () => {
    await commandRepository.init();
    await menuCommandRepository.init();

    const allCommands = [
        ...Object.values(commandRepository.commands).map((c) => c.toJSON()),
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
