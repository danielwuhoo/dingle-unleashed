import { singleton } from 'tsyringe';

declare const fetch: (url: string) => Promise<{ text: () => Promise<string> }>;

@singleton()
export default class PuzzleDataService {
    private static readonly URL = 'https://engaging-data.com/pages/scripts/wordlebot/wordlepuzzles.js';
    public async fetchDistributions(): Promise<Map<number, { cumulative: number[]; individual: number[] }>> {
        try {
            const response = await fetch(PuzzleDataService.URL);
            const text = await response.text();

            // Strip variable assignment prefix (e.g. "wordlepuzzles=" or "var wordlepuzzles = ") and trailing ";"
            const jsonStr = text.replace(/^(?:var\s+)?wordlepuzzles\s*=\s*/, '').replace(/;\s*$/, '');
            const data = JSON.parse(jsonStr);

            const distributions = new Map<number, { cumulative: number[]; individual: number[] }>();
            for (const [key, value] of Object.entries(data)) {
                const puzzleNum = parseInt(key, 10);
                if (!isNaN(puzzleNum) && (value as any).cumulative && (value as any).individual) {
                    distributions.set(puzzleNum, {
                        cumulative: (value as any).cumulative,
                        individual: (value as any).individual,
                    });
                }
            }

            console.log(`[PuzzleDataService] Loaded distributions for ${distributions.size} puzzles`);
            return distributions;
        } catch (error) {
            console.warn('[PuzzleDataService] Failed to fetch distributions, falling back to estimated percentiles:', error);
            return new Map();
        }
    }

    public getPercentile(
        distributions: Map<number, { cumulative: number[]; individual: number[] }>,
        puzzleNumber: number,
        guesses: number,
    ): number | null {
        const dist = distributions.get(puzzleNumber);
        if (!dist) return null;

        if (guesses >= 1 && guesses <= 6) {
            // Use midpoint of the bucket for fairer placement
            return dist.cumulative[guesses - 1] - dist.individual[guesses - 1] / 2;
        }
        // Failed (7 or more) = 100th percentile (worst)
        return 100;
    }
}
