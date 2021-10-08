import { singleton } from 'tsyringe';
import { Config } from '../common/types';

@singleton()
export default class DingleConfig implements Config {
    token: string;

    googleAPIKey: string;

    spotifyClientId: string;

    spotifyClientSecret: string;

    clientId: string;

    guildId: string;

    channelId: string;

    messageId: string;

    public constructor() {
        this.token = process.env.TOKEN;
        this.googleAPIKey = process.env.GOOGLE_API_KEY;
        this.spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
        this.spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        this.clientId = process.env.CLIENT_ID;
        this.guildId = process.env.GUILD_ID;
        this.channelId = process.env.CHANNEL_ID;
        this.messageId = process.env.MESSAGE_ID;
    }
}
