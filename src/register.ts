import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import SlashCommandRepository from './repositories/SlashCommandRepository';
import DingleConfig from './models/DingleConfig';

dotenv.config();

const commandRepository: SlashCommandRepository = container.resolve(SlashCommandRepository);
const config: DingleConfig = container.resolve(DingleConfig);

(async () => {
    await commandRepository.init();
    await commandRepository.registerCommands(config);
})();
