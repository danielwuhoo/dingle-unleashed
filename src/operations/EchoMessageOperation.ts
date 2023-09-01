import { Message, PermissionsBitField } from 'discord.js';
import DingleConfig from '../models/DingleConfig.js';

export default class EchoMessageOperation {
    readonly message: Message;

    readonly newMessage: Message;

    public constructor(message: Message, newMessage?: Message) {
        this.message = message;
        this.newMessage = newMessage;
    }

    public async run(): Promise<void> {
        const { channelId } = new DingleConfig();

        if (this.message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

        if (this.message.channelId === channelId) return;

        if (this.message.author.bot) return;

        if (this.message.content === this.newMessage?.content) return;

        await this.message.channel.send({
            content: `${this.message.content}\n <@${this.message.author.id}>`,
            files: [...this.message.attachments.values()],
        });
    }
}
