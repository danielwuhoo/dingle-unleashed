import { inject, singleton } from 'tsyringe';
import SpotifyWebApi from 'spotify-web-api-node';
import DingleConfig from '../models/DingleConfig';
import { Config, isPlaylistTrackObject } from '../common/types';

@singleton()
export default class SpotifyService {
    public spotifyApi: SpotifyWebApi;

    public constructor(@inject(DingleConfig) public config: Config) {
        this.spotifyApi = new SpotifyWebApi({
            clientId: config.spotifyClientId,
            clientSecret: config.spotifyClientSecret,
        });
    }

    public async init(): Promise<void> {
        try {
            const response = await this.spotifyApi.clientCredentialsGrant();
            this.spotifyApi.setAccessToken(response.body.access_token);
        } catch (err) {
            console.error('Unable to authenticate with Spotify');
        }
    }

    public async fetchTracks(id: string): Promise<SpotifyApi.TrackObjectSimplified[]> {
        const response = await this.spotifyApi.getPlaylistTracks(id).catch(() => this.spotifyApi.getAlbumTracks(id));

        if (response.statusCode === 200) {
            return response.body.items.map((item) => (isPlaylistTrackObject(item) ? item.track : item));
        }

        return new Promise((_, reject) => reject(new Error('Unable to fetch track')));
    }
}
