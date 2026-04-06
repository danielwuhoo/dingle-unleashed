import { GameState } from '@/lib/wordle';

export function getLandingCopy(state: GameState | null | undefined): { subtitle: string; buttonText: string } {
    if (!state || state.guesses.length === 0) {
        return { subtitle: 'ur already cooked', buttonText: 'cook' };
    }
    if (state.gameStatus === 'won') {
        return { subtitle: 'u already cooked today', buttonText: 'see results' };
    }
    if (state.gameStatus === 'lost') {
        return { subtitle: "u got cooked", buttonText: 'see results' };
    }
    return { subtitle: "still cooking", buttonText: 'finish me off' };
}
