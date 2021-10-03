import { ButtonInteraction, CommandInteraction } from 'discord.js';
import { autoInjectable } from 'tsyringe';
import AudioSubscription from '../audio/AudioSubscription';
import AudioSubscriptionRepository from '../repositories/AudioSubscriptionRepository';

@autoInjectable()
export default class PauseOperation {
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

        if (audioSubscription && audioSubscription.voiceConnection && audioSubscription.pause()) {
            this.interaction.reply({ content: 'Audio has been paused', ephemeral: true });
        } else {
            this.interaction.reply({ content: 'Nothing to pause', ephemeral: true });
        }
    }
}
