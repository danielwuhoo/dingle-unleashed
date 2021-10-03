import { AudioPlayerStatus } from '@discordjs/voice';
import { ButtonInteraction, CommandInteraction } from 'discord.js';
import { autoInjectable } from 'tsyringe';
import AudioSubscription from '../audio/AudioSubscription';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';
import PauseOperation from './PauseOperation';
import UnpauseOperation from './UnpauseOperation';

@autoInjectable()
export default class TogglePauseOperation {
    readonly interaction: CommandInteraction | ButtonInteraction;

    readonly audioSubscriptionRepository: AudioSubscriptionRepository;

    public constructor(
        interaction: CommandInteraction | ButtonInteraction,
        audioSubscriptionRepository?: AudioSubscriptionRepository,
    ) {
        this.interaction = interaction;
        this.audioSubscriptionRepository = audioSubscriptionRepository;
    }

    public async run(): Promise<void> {
        const audioSubscription: AudioSubscription = this.audioSubscriptionRepository.getById(this.interaction.guildId);

        if (audioSubscription && audioSubscription.voiceConnection) {
            if (audioSubscription.getPlayerState() === AudioPlayerStatus.Playing) {
                new PauseOperation(this.interaction).run();
            } else if (audioSubscription.getPlayerState() === AudioPlayerStatus.Paused) {
                new UnpauseOperation(this.interaction).run();
            }
        } else {
            this.interaction.reply({ content: 'Nothing is playing', ephemeral: true });
        }
    }
}
