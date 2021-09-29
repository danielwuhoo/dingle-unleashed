import { CommandInteraction } from 'discord.js';
import { autoInjectable } from 'tsyringe';
import AudioSubscription from '../audio/AudioSubscription';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';

@autoInjectable()
export default class StopOperation {
    readonly interaction: CommandInteraction;

    readonly audioSubscriptionRepository: AudioSubscriptionRepository;

    public constructor(interaction: CommandInteraction, audioSubscriptionRepository?: AudioSubscriptionRepository) {
        this.interaction = interaction;
        this.audioSubscriptionRepository = audioSubscriptionRepository;
    }

    public async run(): Promise<void> {
        const audioSubscription: AudioSubscription = this.audioSubscriptionRepository.getById(this.interaction.guildId);

        if (audioSubscription && audioSubscription.voiceConnection) {
            audioSubscription.stop();
            this.interaction.reply({ content: 'Audio has been stopped', ephemeral: true });
        } else {
            this.interaction.reply({ content: 'Nothing to stop', ephemeral: true });
        }
    }
}
