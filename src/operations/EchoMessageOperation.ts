import { Message } from 'discord.js';

export default class EchoMessageOperation {
    readonly message: Message;

    readonly newMessage: Message;

    public constructor(message: Message, newMessage?: Message) {
        this.message = message;
        this.newMessage = newMessage;
    }

    public async run(): Promise<void> {
        if (this.message.author.bot) return;

        if (this.message.content === this.newMessage?.content) return;

        await this.message.channel.send({
            content: `${this.message.content}\n <@${this.message.author.id}>`,
            files: [...this.message.attachments.values()],
        });
    }
}
