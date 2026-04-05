import { Message } from 'discord.js';
import { Event } from '../common/types';
import { config } from '../container';

const MessageCreateEvent: Event = {
    name: 'messageCreate',
    callback: (message: Message) => {
        if (message.channelId === config.channelId) message.delete();
    },
};

export default MessageCreateEvent;
