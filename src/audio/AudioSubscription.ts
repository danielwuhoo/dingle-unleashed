import {
    AudioPlayer,
    AudioPlayerStatus,
    entersState,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { Guild, Message, MessageEmbed, TextChannel, VoiceChannel } from 'discord.js';
import { promisify } from 'util';
import DingleConfig from '../models/DingleConfig';
import Track from './Track';

export default class AudioSubscription {
    public voiceConnection: VoiceConnection;

    public audioPlayer: AudioPlayer;

    public guild: Guild;

    public queue: Track[];

    public embed: MessageEmbed;

    public readyLock: boolean;

    public queueLock: boolean;

    public constructor(voiceConnection: VoiceConnection, audioPlayer: AudioPlayer, guild: Guild) {
        this.guild = guild;
        this.queue = [];
        this.readyLock = false;
        this.queueLock = false;
        this.embed = new MessageEmbed();

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

        audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                // (oldState.resource as AudioResource<Track>).metadata.onFinish();
                this.handleQueue();
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                // (newState.resource as AudioResource<Track>).metadata.onStart();
            }
        });

        voiceConnection.subscribe(audioPlayer);

        this.voiceConnection = voiceConnection;
        this.audioPlayer = audioPlayer;
    }

    public async enqueue(track: Track): Promise<void> {
        await track.init();
        this.queue.push(track);
        this.handleQueue();
    }

    public skip(): boolean {
        return this.audioPlayer.stop();
    }

    public stop(): boolean {
        this.queueLock = true;
        this.queue = [];
        this.queueLock = false;
        return this.audioPlayer.stop(true);
    }

    public getEmbed(): MessageEmbed {
        return this.embed;
    }

    private async updateEmbed(): Promise<void> {
        if (this.voiceConnection?.joinConfig?.channelId) {
            const voiceChannel: VoiceChannel = this.guild.channels.cache.get(
                this.voiceConnection.joinConfig.channelId,
            ) as VoiceChannel;
            this.embed.setAuthor(`Connected to: ${voiceChannel.name}`);
        } else {
            this.embed.setAuthor(`Not connected to a channel`);
        }

        if (this.queue.length > 0) {
            if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
                this.embed.setFields(
                    this.queue.map((track) => {
                        return {
                            name: track.title,
                            value: `Duration: ${AudioSubscription.secondsToHms(track.duration)}`,
                        };
                    }),
                );
            } else {
                this.embed.setDescription(
                    `Currently playing: ${this.queue[0].title}\nDuration: ${AudioSubscription.secondsToHms(
                        this.queue[0].duration,
                    )}`,
                );
                this.embed.setThumbnail(this.queue[0].thumbnailUrl);
                this.embed.setFields(
                    this.queue.slice(1).map((track) => {
                        return {
                            name: track.title,
                            value: `Duration: ${AudioSubscription.secondsToHms(track.duration)}`,
                        };
                    }),
                );
            }
        } else {
            this.embed.setDescription('The queue is empty, use `/play` to add to the queue');
            this.embed.setThumbnail('');
            this.embed.setFields([]);
        }
        const textChannel: TextChannel = this.guild.channels.cache.get(new DingleConfig().channelId) as TextChannel;
        const message: Message = (await textChannel.messages.fetch(new DingleConfig().messageId)) as Message;
        message.edit({ embeds: [this.embed] });
    }

    private async handleQueue(): Promise<void> {
        await this.updateEmbed();
        if (this.queue.length === 0) {
            this.voiceConnection.disconnect();
            return;
        }

        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle) return;

        this.queueLock = true;

        const nextTrack: Track = this.queue.shift();

        try {
            const resource = await nextTrack.createAudioResource();
            this.audioPlayer.play(resource);
        } catch (err) {
            // log error
            this.handleQueue();
        } finally {
            this.queueLock = false;
        }
    }

    private static secondsToHms(d: number): string {
        const h = Math.floor(d / 3600);
        const m = Math.floor((d % 3600) / 60);
        const s = Math.floor((d % 3600) % 60);

        return `${h > 0 ? `${h}h` : ''}${m}m${s}s`;
    }
}
