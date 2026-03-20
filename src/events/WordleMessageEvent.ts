import { Message } from 'discord.js';
import { container } from 'tsyringe';
import { Event } from '../common/types';
import DingleConfig from '../models/DingleConfig';
import WordleService from '../wordle/WordleService';
import PuzzleDataService from '../wordle/PuzzleDataService';
import { parseWordleSummary } from '../wordle/WordleParser';

const WordleMessageEvent: Event = {
    name: 'messageCreate',
    callback: async (message: Message) => {
        const config = container.resolve(DingleConfig);

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

            const puzzleDataService = container.resolve(PuzzleDataService);
            const distributions = await puzzleDataService.fetchDistributions();

            const wordleService = container.resolve(WordleService);
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
