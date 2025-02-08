import { EmbedBuilder, GuildTextBasedChannel, Message, PermissionsBitField } from 'discord.js';
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

        if (this.message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        if (this.message.channelId === channelId) return;

        if (this.message.author.bot) return;

        if (this.message.content === this.newMessage?.content) return;

        const embed = new EmbedBuilder()
            .setColor(this.message.member.displayHexColor)
            .setAuthor({ name: 'Message deleted', iconURL: this.message.member.displayAvatarURL() })
            .setDescription(`<@${this.message.author.id}>\n ${this.message.content}`)
            .setTimestamp(this.message.createdTimestamp);

        await (this.message.channel as GuildTextBasedChannel).send({
            embeds: [embed],
            files: [...this.message.attachments.values()],
        });
    }
}
