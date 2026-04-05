import { loadState } from '@/lib/wordle';

export function getLandingCopy(date: string): { subtitle: string; buttonText: string } {
    const saved = loadState(date);

    if (!saved || saved.guesses.length === 0) {
        return { subtitle: 'ur already cooked', buttonText: 'cook' };
    }
    if (saved.gameStatus === 'won') {
        return { subtitle: 'u already cooked today', buttonText: 'see results' };
    }
    if (saved.gameStatus === 'lost') {
        return { subtitle: "u got cooked", buttonText: 'see results' };
    }
    return { subtitle: "still cooking", buttonText: 'finish me off' };
}
