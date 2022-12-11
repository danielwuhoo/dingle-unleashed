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
const port = process.env.PORT || 3001;
client.init();

app.get('/', (req, res) => {
    res.send('Hello from Express server!');
});

app.listen(port, () => {
    console.log('Express server listening on port 3000');
});
