/* eslint-disable camelcase */
import { google, youtube_v3 } from 'googleapis';
import { Config } from '../common/types';

export default class YoutubeService {
    public youtube: youtube_v3.Youtube;

    public constructor(public config: Config) {}

    public init(): void {
        this.youtube = google.youtube({
            version: 'v3',
            auth: this.config.googleAPIKey,
        });
    }

    public async fetchVideo(query: string): Promise<youtube_v3.Schema$SearchResult> {
        const response = await this.youtube.search.list({
            part: ['id', 'snippet'],
            q: query,
            maxResults: 1,
        });

        return new Promise((resolve, reject) => {
            if (response?.data?.items?.length === 0) {
                reject(new Error('Unable to find video'));
            }
            resolve(response.data.items[0]);
        });
    }

    public async fetchPlaylist(id: string): Promise<youtube_v3.Schema$PlaylistItem[]> {
        const response = await this.youtube.playlistItems.list({
            part: ['id', 'snippet'],
            playlistId: id,
            maxResults: 50,
        });

        return new Promise((resolve, reject) => {
            if (response?.data?.items?.length === 0) {
                reject(new Error('Unable to find playlist'));
            }
            resolve(response.data.items);
        });
    }
}
