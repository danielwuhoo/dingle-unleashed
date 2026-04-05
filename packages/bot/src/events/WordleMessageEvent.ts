import { Message } from 'discord.js';
import { Event } from '../common/types';
import { config, puzzleDataService, wordleService } from '../container';
import { parseWordleSummary } from '../wordle/WordleParser';

const WordleMessageEvent: Event = {
    name: 'messageCreate',
    callback: async (message: Message) => {
        if (!config.wordleChannelId) return;
        if (message.channelId !== config.wordleChannelId) return;
        if (!message.author.bot) return;
        if (!message.content.toLowerCase().includes("here are yesterday's results")) return;

        try {
            const guild = message.guild;
            if (!guild) return;

            const members = await guild.members.fetch();
            const { results, puzzleNumber } = parseWordleSummary(message.content, members);

            if (results.length === 0) {
                console.warn('[Wordle] No results parsed from message');
                return;
            }

            const distributions = await puzzleDataService.fetchDistributions();
            const { newResults, skipped } = wordleService.processResults(results, puzzleNumber, distributions);

            console.log(
                `[Wordle] Puzzle #${puzzleNumber}: ${newResults} new results, ${skipped} skipped`,
            );

            await message.react('✅');
        } catch (error) {
            console.error('[Wordle] Error processing message:', error);
        }
    },
};

export default WordleMessageEvent;
