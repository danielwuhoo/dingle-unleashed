import {
    CommandInteraction,
    ButtonInteraction,
    ContextMenuCommandInteraction,
    GuildMember,
    InteractionCollector,
    InteractionReplyOptions,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    VoiceChannel,
    ButtonStyle,
    APIButtonComponentWithCustomId,
    ComponentType,
    MessageChannelCollectorOptionsParams,
} from 'discord.js';

export default class VoteKickOperation {
    interaction: CommandInteraction;

    userId: string;

    public constructor(interaction: ContextMenuCommandInteraction) {
        this.interaction = interaction;
        this.userId = interaction.targetId;
    }

    public async run(): Promise<void> {
        const member: GuildMember = this.interaction.guild.members.cache.get(this.userId);
        const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;

        if (!voiceChannel) {
            this.interaction.reply(`<@${member.id}> is not currently in a voice channel`);
            return;
        }

        const votesNeeded: number = Math.max(3, Math.ceil(voiceChannel.members.size / 2));
        const votes: Set<GuildMember> = new Set();
        const kickButton: ButtonBuilder = new ButtonBuilder()
            .setCustomId('kick')
            .setLabel('Kick')
            .setStyle(ButtonStyle.Danger);
        const actionRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(
            kickButton,
        );
        const embed: EmbedBuilder = new EmbedBuilder()
            .setTitle('Vote Kick')
            .setDescription(`<@${member.id}>`)
            .setThumbnail(member.user.displayAvatarURL())
            .setFields(
                {
                    name: 'Votes needed',
                    value: `${votesNeeded}`,
                    inline: true,
                },
                {
                    name: 'Current votes',
                    value: `${votes.size}`,
                    inline: true,
                },
            );
        const replyOptions: InteractionReplyOptions = {
            embeds: [embed],
            components: [actionRow],
        };
        const message: Message = (await this.interaction.reply({ ...replyOptions, fetchReply: true })) as Message;

        const options: MessageChannelCollectorOptionsParams<ComponentType.Button> = {
            time: 20000,
            filter: (i: ButtonInteraction) =>
                i.message.id === message.id &&
                i.customId === (kickButton.data as APIButtonComponentWithCustomId).custom_id,
        };

        const collector: InteractionCollector<ButtonInteraction> =
            this.interaction.channel.createMessageComponentCollector<ComponentType.Button>(options);
        collector.on('collect', async (i: ButtonInteraction) => {
            if (votes.has(i.member as GuildMember)) {
                i.reply({ content: 'You voted already you dingus', ephemeral: true });
            } else {
                votes.add(i.member as GuildMember);
                if (votes.size >= votesNeeded) {
                    collector.emit('end');
                } else {
                    embed.setFields(
                        {
                            name: 'Votes needed',
                            value: `${votesNeeded}`,
                            inline: true,
                        },
                        {
                            name: 'Current votes',
                            value: `${votes.size}`,
                            inline: true,
                        },
                    );
                }
                this.interaction.editReply(replyOptions);
                i.reply({ content: 'Vote successful', ephemeral: true });
            }
        });

        collector.on('end', async () => {
            if (votes.size >= votesNeeded) {
                embed.setDescription(`<@${member.id}> has been kicked`);
                member.voice.setChannel(null);
            } else {
                embed.setDescription(`Vote failed for <@${member.id}>`);
            }
            embed.setFields();
            replyOptions.components = [];
            this.interaction.editReply(replyOptions);
        });
    }
}
