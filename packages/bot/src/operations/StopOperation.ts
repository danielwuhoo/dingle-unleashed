import { ButtonInteraction, CommandInteraction } from 'discord.js';
import AudioSubscription from '../audio/AudioSubscription';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';

export default class StopOperation {
    public constructor(
        readonly interaction: CommandInteraction | ButtonInteraction,
        readonly audioSubscriptionRepository: AudioSubscriptionRepository,
    ) {}

    public async run(): Promise<void> {
        const audioSubscription: AudioSubscription = this.audioSubscriptionRepository.getById(this.interaction.guildId);

        if (audioSubscription && audioSubscription.voiceConnection && audioSubscription.stop()) {
            this.interaction.reply({ content: 'Audio has been stopped', ephemeral: true });
        } else {
            this.interaction.reply({ content: 'Nothing to stop', ephemeral: true });
        }
    }
}
