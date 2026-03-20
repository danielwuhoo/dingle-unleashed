import { singleton, inject } from 'tsyringe';
import DatabaseService from '../database/DatabaseService';
import PuzzleDataService from './PuzzleDataService';
import { getPuzzleNumberFromDate } from './WordleParser';

export interface LeaderboardRow {
    user_id: string;
    username: string;
    avg_percentile: number;
    games: number;
}

export type LeaderboardTimeWindow = '1m' | '3m' | 'ytd' | 'all';

@singleton()
export default class WordleService {
    public constructor(
        @inject(DatabaseService) private databaseService?: DatabaseService,
        @inject(PuzzleDataService) private puzzleDataService?: PuzzleDataService,
    ) {}

    private static readonly FALLBACK_PERCENTILES: Record<number, number> = {
        1: 1,
        2: 5,
        3: 18,
        4: 45,
        5: 72,
        6: 90,
    };

    private getPercentileForResult(
        distributions: Map<number, { cumulative: number[]; individual: number[] }> | undefined,
        puzzleNumber: number,
        guesses: number,
    ): number {
        if (distributions?.size) {
            const perc = this.puzzleDataService.getPercentile(distributions, puzzleNumber, guesses);
            if (perc !== null) return perc;
        }
        if (guesses >= 1 && guesses <= 6) {
            return WordleService.FALLBACK_PERCENTILES[guesses];
        }
        return 100;
    }

    public processResults(
        results: Array<{ userId: string; username: string; guesses: number }>,
        puzzleNumber: number,
        distributions?: Map<number, { cumulative: number[]; individual: number[] }>,
    ): { newResults: number; skipped: number } {
        let newResults = 0;
        let skipped = 0;

        for (const result of results) {
            // Upsert player
            this.databaseService.db
                .prepare(
                    `INSERT INTO players (user_id, username) VALUES (?, ?)
                     ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, updated_at = datetime('now')`,
                )
                .run(result.userId, result.username);

            const percentile = this.getPercentileForResult(distributions, puzzleNumber, result.guesses);

            // Insert result with percentile (skip duplicates)
            try {
                this.databaseService.db
                    .prepare(
                        `INSERT INTO wordle_results (user_id, puzzle_number, guesses, percentile) VALUES (?, ?, ?, ?)`,
                    )
                    .run(result.userId, puzzleNumber, result.guesses, percentile);
                newResults++;
            } catch (e) {
                if (e.message?.includes('UNIQUE constraint')) {
                    skipped++;
                } else {
                    throw e;
                }
            }
        }

        return { newResults, skipped };
    }

    public resetData(): void {
        this.databaseService.db.exec(`
            DELETE FROM wordle_results;
        `);
        console.log('[WordleService] Data reset');
    }

    public getPlayerCount(): number {
        const row = this.databaseService.db
            .prepare(`SELECT COUNT(DISTINCT user_id) as count FROM wordle_results`)
            .get() as { count: number };
        return row.count;
    }

    public getLeaderboard(timeWindow: LeaderboardTimeWindow = '3m', limit: number = 10): LeaderboardRow[] {
        const now = new Date();
        let cutoffPuzzle: number | null = null;
        let minGames = 20;

        switch (timeWindow) {
            case '1m': {
                const oneMonthAgo = new Date(now);
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                cutoffPuzzle = getPuzzleNumberFromDate(oneMonthAgo);
                minGames = 7;
                break;
            }
            case '3m': {
                const threeMonthsAgo = new Date(now);
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                cutoffPuzzle = getPuzzleNumberFromDate(threeMonthsAgo);
                break;
            }
            case 'ytd': {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                cutoffPuzzle = getPuzzleNumberFromDate(startOfYear);
                break;
            }
            case 'all':
                cutoffPuzzle = null;
                break;
        }

        if (cutoffPuzzle !== null) {
            return this.databaseService.db
                .prepare(
                    `SELECT wr.user_id, p.username, AVG(wr.percentile) as avg_percentile, COUNT(*) as games
                     FROM wordle_results wr
                     JOIN players p ON p.user_id = wr.user_id
                     WHERE wr.puzzle_number >= ?
                     GROUP BY wr.user_id
                     HAVING COUNT(*) >= ?
                     ORDER BY avg_percentile ASC
                     LIMIT ?`,
                )
                .all(cutoffPuzzle, minGames, limit) as LeaderboardRow[];
        }

        return this.databaseService.db
            .prepare(
                `SELECT wr.user_id, p.username, AVG(wr.percentile) as avg_percentile, COUNT(*) as games
                 FROM wordle_results wr
                 JOIN players p ON p.user_id = wr.user_id
                 GROUP BY wr.user_id
                 HAVING COUNT(*) >= ?
                 ORDER BY avg_percentile ASC
                 LIMIT ?`,
            )
            .all(minGames, limit) as LeaderboardRow[];
    }
}
