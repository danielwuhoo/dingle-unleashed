import { Message } from 'discord.js';
import { Event } from '../common/types';
import EchoMessageOperation from '../operations/EchoMessageOperation';

const MessageDeleteEvent: Event = {
    name: 'messageDelete',
    callback: (message: Message) => {
        if (!message.member.permissions.has('ManageMessages')) new EchoMessageOperation(message).run();
    },
};

export default MessageDeleteEvent;
