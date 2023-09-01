import { Message } from 'discord.js';
import { Event } from '../common/types';
import DingleConfig from '../models/DingleConfig';

const MessageCreateEvent: Event = {
    name: 'messageCreate',
    callback: (message: Message) => {
        const { channelId } = new DingleConfig();
        if (message.channelId === channelId) message.delete();
    },
};

export default MessageCreateEvent;
