import { Message } from 'discord.js';
import { Event } from '../common/types';
import EchoMessageOperation from '../operations/EchoMessageOperation';

const MessageDeleteEvent: Event = {
    name: 'messageDelete',
    callback: (message: Message) => {
        new EchoMessageOperation(message).run();
    },
};

export default MessageDeleteEvent;
