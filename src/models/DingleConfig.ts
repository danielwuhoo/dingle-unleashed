import { singleton } from 'tsyringe';
import { Config } from '../common/types';

@singleton()
export default class DingleConfig implements Config {
    token: string;

    googleAPIKey: string;

    clientId: string;

    guildId: string;

    public constructor() {
        this.token = process.env.TOKEN;
        this.googleAPIKey = process.env.GOOGLE_API_KEY;
        this.clientId = process.env.CLIENT_ID;
        this.guildId = process.env.GUILD_ID;
    }
}
