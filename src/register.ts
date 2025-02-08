import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import SlashCommandRepository from './repositories/SlashCommandRepository';
import DingleConfig from './models/DingleConfig';
import MenuCommandRepository from './repositories/MenuCommandRepository';

dotenv.config();

const commandRepository: SlashCommandRepository = container.resolve(SlashCommandRepository);
const menuCommandRepository: MenuCommandRepository = container.resolve(MenuCommandRepository);
const config: DingleConfig = container.resolve(DingleConfig);

(async () => {
    await commandRepository.init();
    await commandRepository.registerCommands(config);
    await menuCommandRepository.init();
    await menuCommandRepository.registerCommands(config);
})();
