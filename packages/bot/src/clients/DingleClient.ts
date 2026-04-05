import { Client, GatewayIntentBits } from 'discord.js';
import { Config, Event } from '../common/types';
import SlashCommandRepository from '../repositories/SlashCommandRepository';
import EventRepository from '../repositories/EventRepository';
import MenuCommandRepository from '../repositories/MenuCommandRepository';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';
import YoutubeService from '../audio/YoutubeService';
import ButtonCommandRepository from '../repositories/ButtonCommandRepository';
import SpotifyService from '../audio/SpotifyService';
import DatabaseService from '../database/DatabaseService';

export default class DingleClient extends Client {
    public constructor(
        public config: Config,
        public eventRepository: EventRepository,
        public commandRepository: SlashCommandRepository,
        public menuCommandRepository: MenuCommandRepository,
        public buttonCommandRepository: ButtonCommandRepository,
        public audioSubscriptionRepository: AudioSubscriptionRepository,
        public youtubeService: YoutubeService,
        public spotifyService: SpotifyService,
        public databaseService: DatabaseService,
    ) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
            ],
        });
    }

    public async init(): Promise<void> {
        this.databaseService.init();
        await this.commandRepository.init();
        await this.menuCommandRepository.init();
        await this.buttonCommandRepository.init();
        await this.eventRepository.init();
        await this.audioSubscriptionRepository.init();
        await this.youtubeService.init();
        await this.spotifyService.init();

        this.eventRepository.events.forEach((event: Event) => this.on(event.name, event.callback));

        this.login(this.config.token);
    }
}
