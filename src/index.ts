import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import Client from './clients/DingleClient';

dotenv.config();

const client: Client = container.resolve(Client);
client.init();
