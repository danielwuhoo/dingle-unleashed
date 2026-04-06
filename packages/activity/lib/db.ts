import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const MAX_GUESSES = 6;

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'dingle.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS wordle_guesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        puzzle_date TEXT NOT NULL,
        puzzle_number INTEGER NOT NULL,
        guess_number INTEGER NOT NULL,
        word TEXT NOT NULL,
        is_solution INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wordle_guesses_user_puzzle_guess
        ON wordle_guesses(user_id, puzzle_date, guess_number);
`);

interface GuessRow {
    guess_number: number;
    word: string;
    is_solution: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
    guesses: string[];
    gameStatus: GameStatus;
}

export function getGameState(userId: string, date: string): GameState {
    const rows = db
        .prepare('SELECT guess_number, word, is_solution FROM wordle_guesses WHERE user_id = ? AND puzzle_date = ? ORDER BY guess_number')
        .all(userId, date) as GuessRow[];

    const guesses = rows.map((r) => r.word);
    const won = rows.some((r) => r.is_solution === 1);
    const lost = rows.length >= MAX_GUESSES && !won;

    return {
        guesses,
        gameStatus: won ? 'won' : lost ? 'lost' : 'playing',
    };
}

export function insertGuess(
    userId: string,
    date: string,
    puzzleNumber: number,
    guessNumber: number,
    word: string,
    isSolution: boolean,
): void {
    db.prepare(
        'INSERT INTO wordle_guesses (user_id, puzzle_date, puzzle_number, guess_number, word, is_solution) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(userId, date, puzzleNumber, guessNumber, word, isSolution ? 1 : 0);
}
