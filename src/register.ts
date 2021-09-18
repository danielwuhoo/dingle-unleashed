import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import CommandRepository from './repositories/CommandRepository';
import DingleConfig from './models/DingleConfig';

dotenv.config();

const commandRepository: CommandRepository = container.resolve(CommandRepository);
const config: DingleConfig = container.resolve(DingleConfig);

console.log(config);

(async () => {
    await commandRepository.init();
    await commandRepository.registerCommands(config);
})();
