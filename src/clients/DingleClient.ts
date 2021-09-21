import { Client, Intents } from 'discord.js';
import { inject, singleton } from 'tsyringe';
import { Config, Event } from '../common/types';
import SlashCommandRepository from '../repositories/SlashCommandRepository';
import DingleConfig from '../models/DingleConfig';
import EventRepository from '../repositories/EventRepository';
import MenuCommandRepository from '../repositories/MenuCommandRepository';

@singleton()
export default class DingleClient extends Client {
    public config: Config;

    public eventRepository: EventRepository;

    public commandRepository: SlashCommandRepository;

    public menuCommandRepository: MenuCommandRepository;

    public constructor(
        @inject(DingleConfig) config: Config,
        @inject(EventRepository) eventRepository: EventRepository,
        @inject(SlashCommandRepository) commandRepository: SlashCommandRepository,
        @inject(MenuCommandRepository) menuCommandRepository: MenuCommandRepository,
    ) {
        super({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
        });
        this.config = config;
        this.eventRepository = eventRepository;
        this.commandRepository = commandRepository;
        this.menuCommandRepository = menuCommandRepository;
    }

    public async init(): Promise<void> {
        await this.commandRepository.init();
        await this.menuCommandRepository.init();
        await this.eventRepository.init();

        this.eventRepository.events.forEach((event: Event) => this.on(event.name, event.callback));

        this.login(this.config.token);
    }
}
