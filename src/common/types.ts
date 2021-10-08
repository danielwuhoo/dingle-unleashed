export interface Config {
    token: string;
    googleAPIKey: string;
    spotifyClientId: string;
    spotifyClientSecret: string;
    clientId: string;
    guildId: string;
    channelId: string;
    messageId: string;
}

export interface Event {
    name: string;
    callback: (...args: unknown[]) => void;
}

export enum AudioSource {
    Youtube = 'YOUTUBE',
    Spotify = 'SPOTIFY',
}

export function isPlaylistTrackObject(object: unknown): object is SpotifyApi.PlaylistTrackObject {
    return Object.prototype.hasOwnProperty.call(object, 'track');
}
