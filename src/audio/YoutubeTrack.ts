/* eslint-disable camelcase */
import { AudioResource, createAudioResource } from '@discordjs/voice';
import { youtube_v3 } from 'googleapis';
import { container } from 'tsyringe';
import ytdl from 'ytdl-core';
import yts from 'yt-search';
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

        if (ytdl.validateID(this.query)) {
            this.videoInfo = await ytdl.getInfo(this.query);
        } else {
            try {
                const response: yts.SearchResult = await yts(this.query);
                if (response.videos.length === 0) return new Promise((resolve) => resolve());
                const firstResult = response.videos[0];
                this.videoInfo = await ytdl.getInfo(firstResult.videoId);
            } catch (err) {
                return new Promise((_, reject) => reject(new Error(err)));
            }
        }

        this.title = this.videoInfo.videoDetails.title;
        this.thumbnailUrl = this.videoInfo.videoDetails.thumbnails[0].url;
        this.duration = parseInt(this.videoInfo.videoDetails.lengthSeconds, 10);
        return new Promise((resolve) => resolve());
    }
}
