export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
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

export function getTomorrowEST(): string {
    const now = new Date();
    const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    est.setDate(est.getDate() + 1);
    const year = est.getFullYear();
    const month = String(est.getMonth() + 1).padStart(2, '0');
    const day = String(est.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export const EARLY_ACCESS_HOUR_EST = 19;

export function isEarlyAccessWindow(): boolean {
    const now = new Date();
    const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return est.getHours() >= EARLY_ACCESS_HOUR_EST;
}

export function getAccessiblePuzzleDates(): { today: string; tomorrow: string | null } {
    return {
        today: getTodayEST(),
        tomorrow: isEarlyAccessWindow() ? getTomorrowEST() : null,
    };
}
