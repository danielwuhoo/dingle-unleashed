import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import express from 'express';
import Client from './clients/DingleClient';

dotenv.config();

const client: Client = container.resolve(Client);
const app = express();
client.init();

app.get('/', (req, res) => {
    res.send('Hello from Express server!');
});

app.listen(3000, () => {
    console.log('Express server listening on port 3000');
});
