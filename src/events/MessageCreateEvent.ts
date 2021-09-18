import { Message } from 'discord.js';
import { Event } from '../common/types';

const MessageCreateEvent: Event = {
    name: 'messageCreate',
    callback: (message: Message) => {
        return;
    },
};

export default MessageCreateEvent;
