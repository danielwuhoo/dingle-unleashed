import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'reflect-metadata';
import { container } from 'tsyringe';
import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import fetch from 'node-fetch-commonjs';
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

cron.schedule('*/10 * * * *', () => {
    fetch('https://dingle-unleashed.onrender.com');
});
