import { injectable } from 'tsyringe';
import { Config } from '../common/types';

@injectable()
export default class DingleConfig implements Config {
    token: string;

    clientId: string;

    guildId: string;

    public constructor() {
        this.token = process.env.TOKEN;
        this.clientId = process.env.CLIENT_ID;
        this.guildId = process.env.GUILD_ID;
    }
}
