import { Client, Intents } from 'discord.js';
import { inject, singleton } from 'tsyringe';
import { Config, Event } from '../common/types';
import CommandRepository from '../repositories/CommandRepository';
import DingleConfig from '../models/DingleConfig';
import EventRepository from '../repositories/EventRepository';

@singleton()
export default class DingleClient extends Client {
    public config: Config;

    public eventRepository: EventRepository;

    public commandRepository: CommandRepository;

    public constructor(
        @inject(DingleConfig) config: Config,
        @inject(EventRepository) eventRepository: EventRepository,
        @inject(CommandRepository) commandRepository: CommandRepository,
    ) {
        super({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
        });
        this.config = config;
        this.eventRepository = eventRepository;
        this.commandRepository = commandRepository;
    }

    public async init(): Promise<void> {
        await this.commandRepository.init();
        await this.eventRepository.init();

        this.eventRepository.events.forEach((event: Event) => this.on(event.name, event.callback));

        this.login(this.config.token);
    }
}
