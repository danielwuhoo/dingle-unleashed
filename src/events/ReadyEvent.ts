import { Event } from '../common/types';

const ReadyEvent: Event = {
    name: 'ready',
    callback: () => {
        console.log('Bot is ready');
    },
};

export default ReadyEvent;
