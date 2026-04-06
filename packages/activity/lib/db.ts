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
    CREATE TABLE IF NOT EXISTS wordle_puzzles (
        puzzle_number INTEGER PRIMARY KEY,
        puzzle_date TEXT NOT NULL UNIQUE,
        solution TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wordle_guesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        puzzle_number INTEGER NOT NULL REFERENCES wordle_puzzles(puzzle_number),
        guess_number INTEGER NOT NULL,
        word TEXT NOT NULL,
        is_solution INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wordle_guesses_user_puzzle_guess
        ON wordle_guesses(user_id, puzzle_number, guess_number);

    CREATE TABLE IF NOT EXISTS wordle_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        puzzle_number INTEGER NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, puzzle_number)
    );
`);

// Migration: drop old columns if they exist (puzzle_date, solution on guesses)
// New guesses reference wordle_puzzles via puzzle_number instead

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

export function upsertPuzzle(puzzleNumber: number, date: string, solution: string): void {
    db.prepare(
        'INSERT OR IGNORE INTO wordle_puzzles (puzzle_number, puzzle_date, solution) VALUES (?, ?, ?)',
    ).run(puzzleNumber, date, solution);
}

export function getPuzzleByDate(date: string): { puzzleNumber: number; solution: string } | null {
    const row = db
        .prepare('SELECT puzzle_number, solution FROM wordle_puzzles WHERE puzzle_date = ?')
        .get(date) as { puzzle_number: number; solution: string } | undefined;
    return row ? { puzzleNumber: row.puzzle_number, solution: row.solution } : null;
}

export function getGameState(userId: string, puzzleNumber: number): GameState {
    const rows = db
        .prepare('SELECT guess_number, word, is_solution FROM wordle_guesses WHERE user_id = ? AND puzzle_number = ? ORDER BY guess_number')
        .all(userId, puzzleNumber) as GuessRow[];

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
    puzzleNumber: number,
    guessNumber: number,
    word: string,
    isSolution: boolean,
): void {
    db.prepare(
        'INSERT INTO wordle_guesses (user_id, puzzle_number, guess_number, word, is_solution) VALUES (?, ?, ?, ?, ?)',
    ).run(userId, puzzleNumber, guessNumber, word, isSolution ? 1 : 0);
}

export interface PastGameState {
    guesses: string[];
    gameStatus: GameStatus;
    solution: string;
    puzzleNumber: number;
    puzzleDate: string;
}

export function getPastGame(userId: string, date: string): PastGameState | null {
    const puzzle = getPuzzleByDate(date);
    if (!puzzle) return null;

    const state = getGameState(userId, puzzle.puzzleNumber);

    return {
        guesses: state.guesses,
        gameStatus: state.gameStatus,
        solution: puzzle.solution,
        puzzleNumber: puzzle.puzzleNumber,
        puzzleDate: date,
    };
}

interface HistoryRow {
    puzzle_number: number;
    puzzle_date: string;
    solution: string;
    word: string;
    is_solution: number;
}

export interface HistoryEntry {
    puzzleDate: string;
    puzzleNumber: number;
    guesses: string[];
    solution: string;
    gameStatus: GameStatus;
}

export function getHistory(userId: string): HistoryEntry[] {
    const rows = db
        .prepare(
            `SELECT g.puzzle_number, p.puzzle_date, p.solution, g.word, g.is_solution
             FROM wordle_guesses g
             JOIN wordle_puzzles p ON p.puzzle_number = g.puzzle_number
             WHERE g.user_id = ?
             ORDER BY p.puzzle_date DESC, g.guess_number ASC`,
        )
        .all(userId) as HistoryRow[];

    const grouped = new Map<number, HistoryRow[]>();
    for (const row of rows) {
        const existing = grouped.get(row.puzzle_number) || [];
        existing.push(row);
        grouped.set(row.puzzle_number, existing);
    }

    const entries: HistoryEntry[] = [];
    for (const [, puzzleRows] of grouped) {
        const guesses = puzzleRows.map((r) => r.word);
        const won = puzzleRows.some((r) => r.is_solution === 1);
        const lost = puzzleRows.length >= MAX_GUESSES && !won;

        entries.push({
            puzzleDate: puzzleRows[0].puzzle_date,
            puzzleNumber: puzzleRows[0].puzzle_number,
            guesses,
            solution: puzzleRows[0].solution,
            gameStatus: won ? 'won' : lost ? 'lost' : 'playing',
        });
    }

    return entries;
}

// Sessions

// Migration: add username and avatar columns
try { db.exec('ALTER TABLE wordle_sessions ADD COLUMN username TEXT NOT NULL DEFAULT \'\''); } catch {}
try { db.exec('ALTER TABLE wordle_sessions ADD COLUMN avatar TEXT'); } catch {}

interface SessionRow {
    id: number;
    user_id: string;
    puzzle_number: number;
    channel_id: string;
    message_id: string | null;
    username: string;
    avatar: string | null;
}

export interface Session {
    id: number;
    userId: string;
    puzzleNumber: number;
    channelId: string;
    messageId: string | null;
    username: string;
    avatar: string | null;
}

export function getSession(userId: string, puzzleNumber: number): Session | null {
    const row = db
        .prepare('SELECT * FROM wordle_sessions WHERE user_id = ? AND puzzle_number = ?')
        .get(userId, puzzleNumber) as SessionRow | undefined;
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        puzzleNumber: row.puzzle_number,
        channelId: row.channel_id,
        messageId: row.message_id,
        username: row.username,
        avatar: row.avatar,
    };
}

export function createSession(userId: string, puzzleNumber: number, channelId: string, username: string, avatar?: string | null): Session {
    db.prepare(
        'INSERT OR IGNORE INTO wordle_sessions (user_id, puzzle_number, channel_id, username, avatar) VALUES (?, ?, ?, ?, ?)',
    ).run(userId, puzzleNumber, channelId, username, avatar ?? null);
    return getSession(userId, puzzleNumber)!;
}

export function updateSessionUserInfo(userId: string, puzzleNumber: number, username: string, avatar?: string | null): void {
    db.prepare(
        'UPDATE wordle_sessions SET username = ?, avatar = ? WHERE user_id = ? AND puzzle_number = ?',
    ).run(username, avatar ?? null, userId, puzzleNumber);
}

export function updateSessionMessageId(userId: string, puzzleNumber: number, messageId: string): void {
    db.prepare(
        'UPDATE wordle_sessions SET message_id = ? WHERE user_id = ? AND puzzle_number = ?',
    ).run(messageId, userId, puzzleNumber);
}

export function getSessionsForPuzzle(puzzleNumber: number): Session[] {
    const rows = db
        .prepare('SELECT * FROM wordle_sessions WHERE puzzle_number = ?')
        .all(puzzleNumber) as SessionRow[];
    return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        puzzleNumber: row.puzzle_number,
        channelId: row.channel_id,
        messageId: row.message_id,
        username: row.username,
        avatar: row.avatar,
    }));
}

// Summary

export interface DailySummaryRow {
    userId: string;
    guessCount: number;
    won: boolean;
}

export function getDailySummary(puzzleNumber: number): DailySummaryRow[] {
    const rows = db
        .prepare(
            `SELECT user_id, COUNT(*) as guess_count, MAX(is_solution) as solved
             FROM wordle_guesses
             WHERE puzzle_number = ?
             GROUP BY user_id
             HAVING guess_count >= 1`,
        )
        .all(puzzleNumber) as { user_id: string; guess_count: number; solved: number }[];

    return rows.map((r) => ({
        userId: r.user_id,
        guessCount: r.guess_count,
        won: r.solved === 1,
    }));
}
