import {
    createAudioPlayer,
    CreateVoiceConnectionOptions,
    entersState,
    joinVoiceChannel,
    JoinVoiceChannelOptions,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { CommandInteraction, GuildMember } from 'discord.js';
import { autoInjectable } from 'tsyringe';
import AudioSubscription from '../audio/AudioSubscription';
import TrackFactory from '../audio/TrackFactory';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';

@autoInjectable()
export default class PlayOperation {
    readonly interaction: CommandInteraction;

    readonly audioSubscriptionRepository: AudioSubscriptionRepository;

    readonly trackFactory: TrackFactory;

    public constructor(
        interaction: CommandInteraction,
        audioSubscriptionRepository?: AudioSubscriptionRepository,
        trackFactory?: TrackFactory,
    ) {
        this.interaction = interaction;
        this.audioSubscriptionRepository = audioSubscriptionRepository;
        this.trackFactory = trackFactory;
    }

    public async run(): Promise<void> {
        await this.interaction.deferReply({ ephemeral: true });

        let audioSubscription: AudioSubscription = this.audioSubscriptionRepository.getById(this.interaction.guildId);
        const member: GuildMember = this.interaction.member as GuildMember;
        const query = this.interaction.options.getString('query');

        if (!audioSubscription || !audioSubscription.voiceConnection) {
            if (!member.voice.channelId) {
                this.interaction.reply(`Join a voice channel to use this command`);
                return;
            }
            const options: JoinVoiceChannelOptions & CreateVoiceConnectionOptions = {
                channelId: member.voice.channelId,
                guildId: this.interaction.guildId,
                adapterCreator: this.interaction.guild.voiceAdapterCreator,
            };

            const voiceConnection = joinVoiceChannel(options);
            const audioPlayer = createAudioPlayer();

            audioSubscription = new AudioSubscription(voiceConnection, audioPlayer);

            this.audioSubscriptionRepository.upsert(this.interaction.guildId, audioSubscription);
        }

        try {
            await entersState(audioSubscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
        } catch (err) {
            console.warn(err);
            await this.interaction.followUp({
                content: 'Failed to join voice channel within 20 seconds, try again later',
                ephemeral: true,
            });
        }

        const track = TrackFactory.createTrack(query);
        await audioSubscription.enqueue(track);
        await this.interaction.editReply({ content: 'song added to queue' });
    }
}
