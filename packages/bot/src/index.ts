import dotenv from 'dotenv';

dotenv.config();

import DingleClient from './clients/DingleClient';
import {
    config,
    eventRepository,
    slashCommandRepository,
    menuCommandRepository,
    buttonCommandRepository,
    audioSubscriptionRepository,
    youtubeService,
    spotifyService,
    databaseService,
} from './container';

process.on('uncaughtException', (e) => {
    console.error(e);
    console.error(e.stack);
    console.log('Process will restart now.');
    process.exit(1);
});

const client = new DingleClient(
    config,
    eventRepository,
    slashCommandRepository,
    menuCommandRepository,
    buttonCommandRepository,
    audioSubscriptionRepository,
    youtubeService,
    spotifyService,
    databaseService,
);
client.init();
