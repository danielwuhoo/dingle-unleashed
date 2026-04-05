import { AudioPlayerStatus } from '@discordjs/voice';
import { ButtonInteraction, CommandInteraction } from 'discord.js';
import AudioSubscription from '../audio/AudioSubscription';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';
import PauseOperation from './PauseOperation';
import UnpauseOperation from './UnpauseOperation';

export default class TogglePauseOperation {
    public constructor(
        readonly interaction: CommandInteraction | ButtonInteraction,
        readonly audioSubscriptionRepository: AudioSubscriptionRepository,
    ) {}

    public async run(): Promise<void> {
        const audioSubscription: AudioSubscription = this.audioSubscriptionRepository.getById(this.interaction.guildId);

        if (audioSubscription && audioSubscription.voiceConnection) {
            if (audioSubscription.getPlayerState() === AudioPlayerStatus.Playing) {
                new PauseOperation(this.interaction, this.audioSubscriptionRepository).run();
            } else if (audioSubscription.getPlayerState() === AudioPlayerStatus.Paused) {
                new UnpauseOperation(this.interaction, this.audioSubscriptionRepository).run();
            }
        } else {
            this.interaction.reply({ content: 'Nothing is playing', ephemeral: true });
        }
    }
}
