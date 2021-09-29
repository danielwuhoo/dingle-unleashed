import {
    AudioPlayer,
    AudioPlayerStatus,
    entersState,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { promisify } from 'util';
import Track from './Track';

export default class AudioSubscription {
    public voiceConnection: VoiceConnection;

    public audioPlayer: AudioPlayer;

    public queue: Track[];

    public readyLock: boolean;

    public queueLock: boolean;

    public constructor(voiceConnection: VoiceConnection, audioPlayer: AudioPlayer) {
        this.queue = [];
        this.readyLock = false;
        this.queueLock = false;

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

    private async handleQueue(): Promise<void> {
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
}
