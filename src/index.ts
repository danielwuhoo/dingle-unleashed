import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import Client from './clients/DingleClient';

dotenv.config();

const client: Client = container.resolve(Client);
client.init();

process.on('uncaughtException', (e) => {
    console.error(e);
    console.error(e.stack);
    console.log('Process will restart now.');
    client.destroy();
    process.exit(1);
});
