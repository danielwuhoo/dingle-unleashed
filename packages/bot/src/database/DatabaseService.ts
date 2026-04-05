import Database from 'better-sqlite3';
import path from 'path';

export default class DatabaseService {
    db: Database.Database;

    public init(): void {
        const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'dingle.db');
        const dir = path.dirname(dbPath);

        const fs = require('fs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS players (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS wordle_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES players(user_id),
                puzzle_number INTEGER NOT NULL,
                guesses INTEGER NOT NULL,
                percentile REAL,
                submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(user_id, puzzle_number)
            );

            CREATE INDEX IF NOT EXISTS idx_wordle_results_puzzle ON wordle_results(puzzle_number);
        `);

        // Migration: add percentile column if missing, drop legacy tables/columns
        try {
            this.db.exec('ALTER TABLE wordle_results ADD COLUMN percentile REAL');
        } catch {
            // column already exists
        }
        try {
            this.db.exec('DROP TABLE IF EXISTS elo_history');
        } catch {
            // already dropped
        }

        console.log('Database initialized');
    }
}
