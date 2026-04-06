export type LetterState = 'correct' | 'present' | 'absent';

const WORD_LENGTH = 5;

export function getLetterStates(guess: string, solution: string): LetterState[] {
    const states: LetterState[] = Array(WORD_LENGTH).fill('absent');
    const solutionChars = solution.split('');
    const remaining: (string | null)[] = [...solutionChars];

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === solutionChars[i]) {
            states[i] = 'correct';
            remaining[i] = null;
        }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (states[i] === 'correct') continue;
        const idx = remaining.indexOf(guess[i]);
        if (idx !== -1) {
            states[i] = 'present';
            remaining[idx] = null;
        }
    }

    return states;
}
