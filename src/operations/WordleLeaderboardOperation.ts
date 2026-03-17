import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { autoInjectable } from 'tsyringe';
import WordleService from '../wordle/WordleService';

@autoInjectable()
export default class WordleLeaderboardOperation {
    readonly interaction: ChatInputCommandInteraction;

    readonly wordleService: WordleService;

    public constructor(interaction: ChatInputCommandInteraction, wordleService?: WordleService) {
        this.interaction = interaction;
        this.wordleService = wordleService;
    }

    public async run(): Promise<void> {
        const leaderboard = this.wordleService.getLeaderboard(10);

        if (leaderboard.length === 0) {
            await this.interaction.reply({ content: 'No Wordle results yet!', ephemeral: true });
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = leaderboard.map((entry, i) => {
            const rank = medals[i] || `**${i + 1}.**`;
            const elo = Math.round(entry.elo);
            return `${rank} **${entry.username}** — ${elo} ELO (${entry.games} games)`;
        });

        const embed = new EmbedBuilder()
            .setTitle('🟩 Wordle ELO Leaderboard')
            .setDescription(lines.join('\n'))
            .setColor(0x538d4e)
            .setTimestamp();

        await this.interaction.reply({ embeds: [embed] });
    }
}
