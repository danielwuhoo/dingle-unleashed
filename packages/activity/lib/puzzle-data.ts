const PUZZLE_DATA_URL = 'https://engaging-data.com/pages/scripts/wordlebot/wordlepuzzles.js';

export const FALLBACK_PERCENTILES: Record<number, number> = {
    1: 1,
    2: 5,
    3: 18,
    4: 45,
    5: 72,
    6: 90,
};

export interface PuzzleDistribution {
    cumulative: number[];
    individual: number[];
}

export async function fetchDistributions(): Promise<Map<number, PuzzleDistribution>> {
    try {
        const response = await fetch(PUZZLE_DATA_URL);
        const text = await response.text();

        // Strip variable assignment prefix (e.g. "wordlepuzzles=" or "var wordlepuzzles = ") and trailing ";"
        const jsonStr = text.replace(/^(?:var\s+)?wordlepuzzles\s*=\s*/, '').replace(/;\s*$/, '');
        const data = JSON.parse(jsonStr);

        const distributions = new Map<number, PuzzleDistribution>();
        for (const [key, value] of Object.entries(data)) {
            const puzzleNum = parseInt(key, 10);
            if (!isNaN(puzzleNum) && (value as any).cumulative && (value as any).individual) {
                distributions.set(puzzleNum, {
                    cumulative: (value as any).cumulative,
                    individual: (value as any).individual,
                });
            }
        }

        console.log(`[PuzzleData] Loaded distributions for ${distributions.size} puzzles`);
        return distributions;
    } catch (error) {
        console.warn('[PuzzleData] Failed to fetch distributions:', error);
        return new Map();
    }
}

export function getPercentile(
    cumulative: number[],
    individual: number[],
    guesses: number,
): number {
    if (guesses >= 1 && guesses <= 6) {
        // Use midpoint of the bucket for fairer placement
        return cumulative[guesses - 1] - individual[guesses - 1] / 2;
    }
    return 100;
}

export function getFallbackPercentile(guesses: number): number {
    if (guesses >= 1 && guesses <= 6) {
        return FALLBACK_PERCENTILES[guesses];
    }
    return 100;
}
