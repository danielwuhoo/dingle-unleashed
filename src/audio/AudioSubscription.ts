import {
    AudioPlayer,
    AudioPlayerStatus,
    entersState,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { error } from 'console';
import {
    EmbedField,
    Guild,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    TextChannel,
    VoiceChannel,
    ButtonStyle,
} from 'discord.js';
import { promisify } from 'util';
import DingleConfig from '../models/DingleConfig';
import Track from './Track';

export default class AudioSubscription {
    public voiceConnection: VoiceConnection;

    public audioPlayer: AudioPlayer;

    public guild: Guild;

    public queue: Track[];

    public embed: EmbedBuilder;

    public actionRow: ActionRowBuilder<ButtonBuilder>;

    public readyLock: boolean;

    public queueLock: boolean;

    public queueDisplayLimit: number;

    public constructor(voiceConnection: VoiceConnection, audioPlayer: AudioPlayer, guild: Guild) {
        this.guild = guild;
        this.queue = [];
        this.readyLock = false;
        this.queueLock = false;
        this.embed = new EmbedBuilder().setColor('#11f0b1');
        this.actionRow = null;
        this.queueDisplayLimit = 10;

        voiceConnection.on('stateChange', async (_, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                if (newState.reason === VoiceConnectionDisconnectReason.Manual) {
                    voiceConnection.destroy();
                } else if (
                    newState.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
                    newState.closeCode === 4014
                ) {
                    try {
                        await entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
                    } catch {
                        voiceConnection.destroy();
                    }
                } else if (voiceConnection.rejoinAttempts < 5) {
                    await promisify(setTimeout)((voiceConnection.rejoinAttempts + 1) * 5_000);
                    voiceConnection.rejoin();
                } else {
                    voiceConnection.destroy();
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                this.voiceConnection = null;
                this.stop();
                this.updateEmbed();
                this.updateActionRow();
            } else if (
                !this.readyLock &&
                (newState.status === VoiceConnectionStatus.Connecting ||
                    newState.status === VoiceConnectionStatus.Signalling)
            ) {
                this.readyLock = true;
                try {
                    await entersState(voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                } catch {
                    if (voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) voiceConnection.destroy();
                } finally {
                    this.readyLock = false;
                }
            }
        });

        audioPlayer.on('stateChange', async (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Paused || newState.status === AudioPlayerStatus.Playing) {
                await this.updateActionRow();
            }
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                // (oldState.resource as AudioResource<Track>).metadata.onFinish();
                try {
                    this.queue.shift();
                    await this.handleQueue();
                } catch (err) {
                    await this.updateEmbed();
                }
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                // (newState.resource as AudioResource<Track>).metadata.onStart();
            }
        });

        voiceConnection.subscribe(audioPlayer);

        this.voiceConnection = voiceConnection;
        this.audioPlayer = audioPlayer;
    }

    public async enqueue(track: Track | Track[]): Promise<void> {
        try {
            this.queue = this.queue.concat(track);
            await this.handleQueue();
            return new Promise((resolve) => resolve());
        } catch (err) {
            console.error(error);
            return new Promise((_, reject) => reject(new Error(err)));
        }
    }

    public skip(): boolean {
        return this.audioPlayer.stop();
    }

    public pause(): boolean {
        return this.audioPlayer.pause();
    }

    public unpause(): boolean {
        return this.audioPlayer.unpause();
    }

    public stop(): boolean {
        this.queueLock = true;
        this.queue = [];
        this.queueLock = false;
        return this.audioPlayer.stop(true);
    }

    public getEmbed(): EmbedBuilder {
        return this.embed;
    }

    public getPlayerState(): AudioPlayerStatus {
        return this.audioPlayer.state.status;
    }

    private async updateEmbed(): Promise<void> {
        // TODO: pull dynamically from a database
        const textChannel: TextChannel = this.guild.channels.cache.get(new DingleConfig().channelId) as TextChannel;
        const message: Message = (await textChannel.messages.fetch(new DingleConfig().messageId)) as Message;
        if (this.voiceConnection?.joinConfig?.channelId) {
            const voiceChannel: VoiceChannel = this.guild.channels.cache.get(
                this.voiceConnection.joinConfig.channelId,
            ) as VoiceChannel;
            this.embed.setAuthor({ name: `Connected to: ${voiceChannel.name}` });
        } else {
            this.embed.setAuthor({ name: `Not connected to a channel` });
        }

        if (this.queue.length) {
            if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
                this.embed.setDescription(
                    `***Currently playing:*** **${this.queue[0].title}**\nDuration: ${AudioSubscription.secondsToHms(
                        this.queue[0].duration,
                    )}`,
                );
                this.embed.setThumbnail(this.queue[0].thumbnailUrl);
            }
            this.embed.setFields(this.queue.slice(1, this.queueDisplayLimit).map(AudioSubscription.trackToField));
        } else {
            this.embed.setDescription('The queue is empty, use `/play` to add to the queue');
            this.embed.setThumbnail(null);
            this.embed.setFields([]);
        }
        message.edit({ embeds: [this.embed] });
    }

    private async updateActionRow(): Promise<void> {
        const textChannel: TextChannel = this.guild.channels.cache.get(new DingleConfig().channelId) as TextChannel;
        const message: Message = (await textChannel.messages.fetch(new DingleConfig().messageId)) as Message;
        this.actionRow = null;
        if (this.voiceConnection) {
            this.actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('togglePause')
                    .setLabel(this.audioPlayer.state.status === AudioPlayerStatus.Paused ? 'Unpause' : 'Pause')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skip').setLabel('Skip').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger),
            );
        }
        message.edit({ components: this.actionRow ? [this.actionRow] : [] });
    }

    private async handleQueue(): Promise<void> {
        await Promise.all(
            this.queue
                .slice(0, this.queueDisplayLimit)
                .filter(({ isInitialized }) => !isInitialized)
                .map((t) => t.init()),
        );
        await this.updateEmbed();
        if (this.queue.length === 0) {
            this.voiceConnection.disconnect();
            return new Promise((_, reject) => reject(new Error('No songs in queue')));
        }

        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle)
            return new Promise((resolve) => resolve());

        this.queueLock = true;

        const nextTrack: Track = this.queue[0];

        try {
            const resource = await nextTrack.createAudioResource();
            this.audioPlayer.play(resource);
        } catch (err) {
            console.error(err);
            this.handleQueue();
        } finally {
            this.queueLock = false;
        }
        return new Promise((resolve) => resolve());
    }

    private static secondsToHms(d: number): string {
        const h = Math.floor(d / 3600);
        const m = Math.floor((d % 3600) / 60);
        const s = Math.floor((d % 3600) % 60);

        return `${h > 0 ? `${h}h` : ''}${m}m${s}s`;
    }

    private static trackToField(track: Track, index: number): EmbedField {
        return {
            name: `${index + 2}. ${track.title}`,
            value: `Duration: ${AudioSubscription.secondsToHms(track.duration)}`,
            inline: false,
        };
    }
}
