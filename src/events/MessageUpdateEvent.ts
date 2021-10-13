import { Message } from 'discord.js';
import { Event } from '../common/types';
import EchoMessageOperation from '../operations/EchoMessageOperation';

const MessageUpdateEvent: Event = {
    name: 'messageUpdate',
    callback: (oldMessage: Message, newMessage: Message) => {
        new EchoMessageOperation(oldMessage, newMessage).run();
    },
};

export default MessageUpdateEvent;
