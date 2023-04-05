/* eslint-disable camelcase */
import { container, singleton } from 'tsyringe';
import { URL } from 'url';
import { parseDomain, ParseResultListed } from 'parse-domain';
import { yt_validate } from 'play-dl';
import YoutubeTrack from './YoutubeTrack';
import Track from './Track';
import { AudioSource } from '../common/types';
import YoutubeService from './YoutubeService';
import SpotifyService from './SpotifyService';

@singleton()
export default class TrackFactory {
    public audioSourceMap: Map<string, AudioSource>;

    private youtubeService: YoutubeService;

    private spotifyService: SpotifyService;

    public constructor() {
        this.audioSourceMap = new Map();
        this.audioSourceMap.set('youtube', AudioSource.Youtube);
        this.audioSourceMap.set('spotify', AudioSource.Spotify);
        this.youtubeService = container.resolve(YoutubeService);
        this.spotifyService = container.resolve(SpotifyService);
    }

    public async create(query: string): Promise<Track | Track[]> {
        let url: URL;

        try {
            url = new URL(query);
        } catch (err) {
            return new YoutubeTrack(query);
        }

        const result: ParseResultListed = parseDomain(url.hostname) as ParseResultListed;
        switch (this.audioSourceMap.get(result.domain)) {
            case AudioSource.Youtube: {
                const v = url.searchParams.get('v');
                if (v && yt_validate(v)) {
                    return new YoutubeTrack(v);
                }
                const list = url.searchParams.get('list');
                if (list) {
                    try {
                        const playlist = await this.youtubeService.fetchPlaylist(list);
                        return playlist.map((item) => new YoutubeTrack(item.snippet.resourceId.videoId));
                    } catch (err) {
                        return new Promise((_, reject) => reject(new Error(err)));
                    }
                }
                break;
            }
            case AudioSource.Spotify: {
                const id = url.pathname.split('/').pop();
                const tracks = await this.spotifyService.fetchTracks(id);
                return tracks.map(
                    (track) =>
                        new YoutubeTrack(`${track.name} ${track.artists.map((artist) => artist.name).join(' ')}`),
                );
                break;
            }
            default:
                return new Promise((_, reject) => reject(new Error('Unsupported url type')));
        }
        return new Promise((_, reject) => reject(new Error('Unsupported url type')));
    }
}
