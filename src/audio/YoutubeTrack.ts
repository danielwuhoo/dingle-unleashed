/* eslint-disable camelcase */
import { AudioResource, createAudioResource } from '@discordjs/voice';
import { video_info, InfoData, stream_from_info, YouTubeStream } from 'play-dl';
import yts from 'yt-search';
import Track from './Track';

export default class YoutubeTrack extends Track {
    public videoInfo: InfoData;

    public stream: YouTubeStream;

    public async createAudioResource(): Promise<AudioResource<Track>> {
        if (!this.videoInfo) {
            return new Promise((_, reject) => reject(new Error('Video info unavailable')));
        }
        this.stream = await stream_from_info(this.videoInfo);
        const audioResource: AudioResource<Track> = createAudioResource(this.stream.stream, {
            inputType: this.stream.type,
        });

        return new Promise((resolve, reject) =>
            audioResource !== null ? resolve(audioResource) : reject(new Error('Unable to find video')),
        );
    }

    public async init(): Promise<void> {
        this.isInitialized = false;
        try {
            this.videoInfo = await video_info(this.query);
        } catch {
            try {
                const response: yts.SearchResult = await yts(this.query);
                if (response.videos.length === 0) return new Promise((resolve) => resolve());
                const firstResult = response.videos[0];
                this.videoInfo = await video_info(firstResult.url);
            } catch (err) {
                return new Promise((_, reject) => reject(new Error(err)));
            }
        }

        this.title = this.videoInfo.video_details.title;
        this.thumbnailUrl = this.videoInfo.video_details.thumbnails[0].url;
        this.duration = this.videoInfo.video_details.durationInSec;
        this.isInitialized = true;
        return new Promise((resolve) => resolve());
    }
}
