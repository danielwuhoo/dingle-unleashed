/* eslint-disable camelcase */
import { AudioResource, createAudioResource } from '@discordjs/voice';
import { youtube_v3 } from 'googleapis';
import { container } from 'tsyringe';
import ytdl from 'ytdl-core';
import Track from './Track';
import YoutubeService from './YoutubeService';

export default class YoutubeTrack extends Track {
    public videoInfo: ytdl.videoInfo;

    public async createAudioResource(): Promise<AudioResource<Track>> {
        const ytdlOptions: ytdl.downloadOptions = {
            filter: 'audioonly',
            highWaterMark: 16e6,
        };

        const audioResource: AudioResource<Track> = createAudioResource(
            ytdl.downloadFromInfo(this.videoInfo, ytdlOptions),
        );

        return new Promise((resolve, reject) =>
            audioResource !== null ? resolve(audioResource) : reject(new Error('Unable to find video')),
        );
    }

    public async init(): Promise<void> {
        const youtubeService: YoutubeService = container.resolve(YoutubeService);

        if (ytdl.validateURL(this.query)) {
            this.videoInfo = await ytdl.getInfo(this.query);
        } else {
            try {
                const firstResult: youtube_v3.Schema$SearchResult = await youtubeService.fetchVideo(this.query);
                this.videoInfo = await ytdl.getInfo(firstResult.id.videoId);
            } catch (err) {
                return new Promise((_, reject) => reject(new Error(err)));
            }
        }

        this.title = this.videoInfo.videoDetails.title;
        this.thumbnailUrl = this.videoInfo.videoDetails.thumbnails[0].url;
        this.duration = parseInt(this.videoInfo.videoDetails.lengthSeconds, 10);
    }
}