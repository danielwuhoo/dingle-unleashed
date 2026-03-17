import { singleton, inject } from 'tsyringe';
import DatabaseService from '../database/DatabaseService';

interface PlayerRow {
    user_id: string;
    username: string;
    elo: number;
}

interface ResultRow {
    user_id: string;
    guesses: number;
}

interface EloHistoryRow {
    user_id: string;
    elo_before: number;
    elo_after: number;
}

interface LeaderboardRow {
    user_id: string;
    username: string;
    elo: number;
    games: number;
}

@singleton()
export default class WordleService {
    public constructor(@inject(DatabaseService) private databaseService?: DatabaseService) {}

    public processResults(
        results: Array<{ userId: string; username: string; guesses: number }>,
        puzzleNumber: number,
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

            // Insert result (skip duplicates)
            try {
                this.databaseService.db
                    .prepare(
                        `INSERT INTO wordle_results (user_id, puzzle_number, guesses) VALUES (?, ?, ?)`,
                    )
                    .run(result.userId, puzzleNumber, result.guesses);
                newResults++;
            } catch (e) {
                if (e.message?.includes('UNIQUE constraint')) {
                    skipped++;
                } else {
                    throw e;
                }
            }
        }

        if (newResults > 0) {
            this.recalculateEloForPuzzle(puzzleNumber);
        }

        return { newResults, skipped };
    }

    private recalculateEloForPuzzle(puzzleNumber: number): void {
        const transaction = this.databaseService.db.transaction(() => {
            // Revert previous ELO changes for this puzzle
            const previousHistory = this.databaseService.db
                .prepare('SELECT user_id, elo_before FROM elo_history WHERE puzzle_number = ?')
                .all(puzzleNumber) as EloHistoryRow[];

            for (const row of previousHistory) {
                this.databaseService.db
                    .prepare('UPDATE players SET elo = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
                    .run(row.elo_before, row.user_id);
            }

            this.databaseService.db
                .prepare('DELETE FROM elo_history WHERE puzzle_number = ?')
                .run(puzzleNumber);

            // Get all results for this puzzle
            const puzzleResults = this.databaseService.db
                .prepare('SELECT user_id, guesses FROM wordle_results WHERE puzzle_number = ?')
                .all(puzzleNumber) as ResultRow[];

            if (puzzleResults.length < 2) return;

            // Get current ELO for all participants
            const players: Record<string, number> = {};
            for (const result of puzzleResults) {
                const player = this.databaseService.db
                    .prepare('SELECT elo FROM players WHERE user_id = ?')
                    .get(result.user_id) as PlayerRow;
                players[result.user_id] = player.elo;
            }

            // Calculate ELO deltas from pairwise comparisons
            const deltas: Record<string, number> = {};
            for (const r of puzzleResults) {
                deltas[r.user_id] = 0;
            }

            const K = 32;
            for (let i = 0; i < puzzleResults.length; i++) {
                for (let j = i + 1; j < puzzleResults.length; j++) {
                    const a = puzzleResults[i];
                    const b = puzzleResults[j];
                    const ratingA = players[a.user_id];
                    const ratingB = players[b.user_id];

                    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
                    const expectedB = 1 - expectedA;

                    let actualA: number;
                    let actualB: number;
                    if (a.guesses < b.guesses) {
                        actualA = 1.0;
                        actualB = 0.0;
                    } else if (a.guesses > b.guesses) {
                        actualA = 0.0;
                        actualB = 1.0;
                    } else {
                        actualA = 0.5;
                        actualB = 0.5;
                    }

                    deltas[a.user_id] += K * (actualA - expectedA);
                    deltas[b.user_id] += K * (actualB - expectedB);
                }
            }

            // Apply deltas and record history
            for (const result of puzzleResults) {
                const eloBefore = players[result.user_id];
                const eloAfter = eloBefore + deltas[result.user_id];

                this.databaseService.db
                    .prepare('UPDATE players SET elo = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
                    .run(eloAfter, result.user_id);

                this.databaseService.db
                    .prepare(
                        `INSERT INTO elo_history (user_id, puzzle_number, elo_before, elo_after) VALUES (?, ?, ?, ?)
                         ON CONFLICT(user_id, puzzle_number) DO UPDATE SET elo_before = excluded.elo_before, elo_after = excluded.elo_after`,
                    )
                    .run(result.user_id, puzzleNumber, eloBefore, eloAfter);
            }
        });

        transaction();
    }

    public getLeaderboard(limit: number = 10): LeaderboardRow[] {
        return this.databaseService.db
            .prepare(
                `SELECT p.user_id, p.username, p.elo,
                        (SELECT COUNT(*) FROM wordle_results wr WHERE wr.user_id = p.user_id) as games
                 FROM players p
                 ORDER BY p.elo DESC
                 LIMIT ?`,
            )
            .all(limit) as LeaderboardRow[];
    }
}
