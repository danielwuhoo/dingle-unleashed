export type GameStatus = 'playing' | 'won' | 'lost';

export interface SavedState {
    guesses: string[];
    gameStatus: GameStatus;
}

export function getTodayEST(): string {
    const now = new Date();
    const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = est.getFullYear();
    const month = String(est.getMonth() + 1).padStart(2, '0');
    const day = String(est.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getStorageKey(date: string): string {
    return `wordle-${date}`;
}

export function loadState(date: string): SavedState | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(getStorageKey(date));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function saveState(date: string, state: SavedState): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey(date), JSON.stringify(state));
}
