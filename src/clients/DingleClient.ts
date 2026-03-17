import { Client, GatewayIntentBits } from 'discord.js';
import { inject, singleton } from 'tsyringe';
import { Config, Event } from '../common/types';
import SlashCommandRepository from '../repositories/SlashCommandRepository';
import DingleConfig from '../models/DingleConfig';
import EventRepository from '../repositories/EventRepository';
import MenuCommandRepository from '../repositories/MenuCommandRepository';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';
import YoutubeService from '../audio/YoutubeService';
import ButtonCommandRepository from '../repositories/ButtonCommandRepository';
import SpotifyService from '../audio/SpotifyService';
import DatabaseService from '../database/DatabaseService';

@singleton()
export default class DingleClient extends Client {
    public constructor(
        @inject(DingleConfig) public config: Config,
        @inject(EventRepository) public eventRepository: EventRepository,
        @inject(SlashCommandRepository) public commandRepository: SlashCommandRepository,
        @inject(MenuCommandRepository) public menuCommandRepository: MenuCommandRepository,
        @inject(ButtonCommandRepository) public buttonCommandRepository: ButtonCommandRepository,
        @inject(AudioSubscriptionRepository) public audioSubscriptionRepository: AudioSubscriptionRepository,
        @inject(YoutubeService) public youtubeService: YoutubeService,
        @inject(SpotifyService) public spotifyService: SpotifyService,
        @inject(DatabaseService) public databaseService: DatabaseService,
    ) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
            ],
        });
        this.config = config;
        this.eventRepository = eventRepository;
        this.commandRepository = commandRepository;
        this.menuCommandRepository = menuCommandRepository;
        this.buttonCommandRepository = buttonCommandRepository;
        this.audioSubscriptionRepository = audioSubscriptionRepository;
        this.youtubeService = youtubeService;
        this.spotifyService = spotifyService;
        this.databaseService = databaseService;
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
