import { Snowflake } from 'discord.js';
import { singleton } from 'tsyringe';
import AudioSubscription from '../audio/AudioSubscription';

@singleton()
export default class AudioSubscriptionRepository {
    public subscriptions: Map<Snowflake, AudioSubscription>;

    public constructor() {
        this.subscriptions = new Map<Snowflake, AudioSubscription>();
    }

    public async init(): Promise<void> {
        // prob something to pull guild info from a db
        this.subscriptions = new Map<Snowflake, AudioSubscription>();
    }

    public upsert(guildId: Snowflake, subscription: AudioSubscription): AudioSubscriptionRepository {
        this.subscriptions.set(guildId, subscription);
        return this;
    }

    public getById(guildId: Snowflake): AudioSubscription {
        return this.subscriptions.get(guildId);
    }
}
