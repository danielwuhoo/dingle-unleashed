import { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { autoInjectable } from 'tsyringe';
import WordleService from '../wordle/WordleService';
import { parseWordleSummary, getPuzzleNumberFromDate } from '../wordle/WordleParser';
import DingleConfig from '../models/DingleConfig';

@autoInjectable()
export default class WordleBackfillOperation {
    readonly interaction: ChatInputCommandInteraction;

    readonly wordleService: WordleService;

    readonly config: DingleConfig;

    public constructor(
        interaction: ChatInputCommandInteraction,
        wordleService?: WordleService,
        config?: DingleConfig,
    ) {
        this.interaction = interaction;
        this.wordleService = wordleService;
        this.config = config;
    }

    public async run(): Promise<void> {
        await this.interaction.deferReply();

        const channelId = this.config.wordleChannelId;
        if (!channelId) {
            await this.interaction.editReply('WORDLE_CHANNEL_ID is not configured.');
            return;
        }

        const channel = this.interaction.guild?.channels.cache.get(channelId) as TextChannel;
        if (!channel) {
            await this.interaction.editReply('Could not find the Wordle channel.');
            return;
        }

        const members = await this.interaction.guild.members.fetch();

        // Fetch all matching messages by paginating
        const wordleMessages = [];
        let cursor: string | undefined;
        let fetchCount = 0;

        while (true) {
            const options: { limit: number; before?: string } = { limit: 100 };
            if (cursor) options.before = cursor;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            fetchCount++;
            const matching = messages.filter(
                (m) =>
                    m.author.bot &&
                    m.content.toLowerCase().includes("here are yesterday's results"),
            );
            matching.forEach((m) => wordleMessages.push(m));

            cursor = messages.last()?.id;

            if (fetchCount % 5 === 0) {
                await this.interaction.editReply(
                    `Fetching messages... (${wordleMessages.length} Wordle messages found so far)`,
                );
            }
        }

        // Sort chronologically (oldest first)
        wordleMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        await this.interaction.editReply(
            `Found ${wordleMessages.length} Wordle messages. Processing...`,
        );

        let totalNew = 0;
        let totalSkipped = 0;
        let totalPuzzles = 0;
        const unresolvedNames = new Set<string>();

        for (let i = 0; i < wordleMessages.length; i++) {
            const msg = wordleMessages[i];
            const messageDate = new Date(msg.createdTimestamp);
            const puzzleNumber = getPuzzleNumberFromDate(messageDate);

            const { results } = parseWordleSummary(msg.content, members, messageDate);
            if (results.length > 0) {
                const { newResults, skipped } = this.wordleService.processResults(
                    results,
                    puzzleNumber,
                );
                totalNew += newResults;
                totalSkipped += skipped;
                totalPuzzles++;
            }

            if ((i + 1) % 50 === 0) {
                await this.interaction.editReply(
                    `Processing puzzle ${i + 1}/${wordleMessages.length}...`,
                );
            }
        }

        const playersCount = this.wordleService.getLeaderboard(100).length;

        await this.interaction.editReply(
            `Backfill complete!\n` +
                `• **${totalPuzzles}** puzzles processed\n` +
                `• **${totalNew}** new results added\n` +
                `• **${totalSkipped}** duplicates skipped\n` +
                `• **${playersCount}** players found`,
        );
    }
}
