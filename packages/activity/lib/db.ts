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

// Migration: add distribution columns to wordle_puzzles
try { db.exec('ALTER TABLE wordle_puzzles ADD COLUMN cumulative TEXT'); } catch {}
try { db.exec('ALTER TABLE wordle_puzzles ADD COLUMN individual TEXT'); } catch {}

// User settings
db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        colorblind INTEGER NOT NULL DEFAULT 0,
        light_mode INTEGER NOT NULL DEFAULT 0
    );
`);

export interface UserSettings {
    colorblind: boolean;
    lightMode: boolean;
}

export function getUserSettings(userId: string): UserSettings {
    const row = db.prepare('SELECT colorblind, light_mode FROM user_settings WHERE user_id = ?')
        .get(userId) as { colorblind: number; light_mode: number } | undefined;
    return {
        colorblind: row?.colorblind === 1,
        lightMode: row?.light_mode === 1,
    };
}

export function updateUserSettings(userId: string, settings: Partial<UserSettings>): UserSettings {
    const current = getUserSettings(userId);
    const colorblind = settings.colorblind ?? current.colorblind;
    const lightMode = settings.lightMode ?? current.lightMode;
    db.prepare(
        `INSERT INTO user_settings (user_id, colorblind, light_mode) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET colorblind = excluded.colorblind, light_mode = excluded.light_mode`,
    ).run(userId, colorblind ? 1 : 0, lightMode ? 1 : 0);
    return { colorblind, lightMode };
}

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

// Day Results (for Today/Yesterday leaderboard views)

export interface DayPlayer {
    userId: string;
    username: string;
    avatar: string | null;
}

export interface DayGroup {
    guessCount: number;
    percentile?: number;
    players: DayPlayer[];
}

export function getDayResults(date: string, includePercentile: boolean): DayGroup[] {
    const gameRows = db.prepare(`
        SELECT g.user_id, COUNT(*) as guess_count, MAX(g.is_solution) as solved
        FROM wordle_guesses g
        JOIN wordle_puzzles p ON p.puzzle_number = g.puzzle_number
        WHERE p.puzzle_date = ?
        GROUP BY g.user_id
        HAVING solved = 1 OR guess_count >= 6
    `).all(date) as { user_id: string; guess_count: number; solved: number }[];

    // Group by effective guess count (7 = failed)
    const groups = new Map<number, DayPlayer[]>();
    for (const row of gameRows) {
        const effectiveGuesses = row.solved ? row.guess_count : 7;

        const userRow = db.prepare(
            'SELECT username, avatar FROM wordle_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        ).get(row.user_id) as { username: string; avatar: string | null } | undefined;

        const player: DayPlayer = {
            userId: row.user_id,
            username: userRow?.username || row.user_id,
            avatar: userRow?.avatar || null,
        };

        const existing = groups.get(effectiveGuesses) || [];
        existing.push(player);
        groups.set(effectiveGuesses, existing);
    }

    // Build result ordered 1→6→7
    const result: DayGroup[] = [];
    let puzzleDist: { cumulative: number[]; individual: number[] } | null = null;

    if (includePercentile) {
        const puzzle = db.prepare(
            'SELECT cumulative, individual FROM wordle_puzzles WHERE puzzle_date = ?',
        ).get(date) as { cumulative: string | null; individual: string | null } | undefined;

        if (puzzle?.cumulative && puzzle?.individual) {
            puzzleDist = {
                cumulative: JSON.parse(puzzle.cumulative),
                individual: JSON.parse(puzzle.individual),
            };
        }
    }

    for (const guessCount of [1, 2, 3, 4, 5, 6, 7]) {
        const players = groups.get(guessCount);
        if (!players || players.length === 0) continue;

        const group: DayGroup = { guessCount, players };

        if (includePercentile && puzzleDist) {
            group.percentile = Math.round(
                getPercentile(puzzleDist.cumulative, puzzleDist.individual, guessCount) * 10,
            ) / 10;
        }

        result.push(group);
    }

    return result;
}

// Distributions

export function updatePuzzleDistribution(puzzleNumber: number, cumulative: number[], individual: number[]): void {
    db.prepare(
        'UPDATE wordle_puzzles SET cumulative = ?, individual = ? WHERE puzzle_number = ?',
    ).run(JSON.stringify(cumulative), JSON.stringify(individual), puzzleNumber);
}

// Leaderboard

interface LeaderboardGameRow {
    user_id: string;
    puzzle_number: number;
    guess_count: number;
    solved: number;
    cumulative: string | null;
    individual: string | null;
}

interface LeaderboardUserRow {
    user_id: string;
    username: string;
    avatar: string | null;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    avatar: string | null;
    avgPercentile: number;
    games: number;
    currentStreak: number;
}

import { getPercentile, getFallbackPercentile } from './puzzle-data';
import { getTodayEST } from './wordle';

function prevDate(yyyymmdd: string): string {
    const d = new Date(yyyymmdd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

export function getCurrentStreak(userId: string): number {
    const rows = db.prepare(`
        SELECT p.puzzle_date
        FROM wordle_guesses g
        JOIN wordle_puzzles p ON p.puzzle_number = g.puzzle_number
        WHERE g.user_id = ?
        GROUP BY g.puzzle_number
        HAVING MAX(g.is_solution) = 1 OR COUNT(*) >= 6
        ORDER BY p.puzzle_date DESC
    `).all(userId) as { puzzle_date: string }[];

    if (!rows.length) return 0;

    const playedSet = new Set(rows.map((r) => r.puzzle_date));
    const today = getTodayEST();

    // Start from today if played, otherwise yesterday (grace period)
    let cursor = playedSet.has(today) ? today : prevDate(today);

    let streak = 0;
    while (playedSet.has(cursor)) {
        streak++;
        cursor = prevDate(cursor);
    }
    return streak;
}

export function getLeaderboard(dateCutoff: string | null, minGames: number, exactDate?: string): LeaderboardEntry[] {
    let query: string;
    let gameRows: LeaderboardGameRow[];

    if (exactDate) {
        query = `SELECT g.user_id, g.puzzle_number, COUNT(*) as guess_count, MAX(g.is_solution) as solved,
                  p.cumulative, p.individual
           FROM wordle_guesses g
           JOIN wordle_puzzles p ON p.puzzle_number = g.puzzle_number
           WHERE p.puzzle_date = ?
           GROUP BY g.user_id, g.puzzle_number
           HAVING solved = 1 OR guess_count >= 6`;
        gameRows = db.prepare(query).all(exactDate) as LeaderboardGameRow[];
    } else if (dateCutoff) {
        query = `SELECT g.user_id, g.puzzle_number, COUNT(*) as guess_count, MAX(g.is_solution) as solved,
                  p.cumulative, p.individual
           FROM wordle_guesses g
           JOIN wordle_puzzles p ON p.puzzle_number = g.puzzle_number
           WHERE p.puzzle_date >= ?
           GROUP BY g.user_id, g.puzzle_number
           HAVING solved = 1 OR guess_count >= 6`;
        gameRows = db.prepare(query).all(dateCutoff) as LeaderboardGameRow[];
    } else {
        query = `SELECT g.user_id, g.puzzle_number, COUNT(*) as guess_count, MAX(g.is_solution) as solved,
                  p.cumulative, p.individual
           FROM wordle_guesses g
           JOIN wordle_puzzles p ON p.puzzle_number = g.puzzle_number
           GROUP BY g.user_id, g.puzzle_number
           HAVING solved = 1 OR guess_count >= 6`;
        gameRows = db.prepare(query).all() as LeaderboardGameRow[];
    }

    // Group by user, compute average percentile
    const userGames = new Map<string, number[]>();
    for (const row of gameRows) {
        let percentile: number;
        if (row.cumulative && row.individual) {
            const cumulative = JSON.parse(row.cumulative) as number[];
            const individual = JSON.parse(row.individual) as number[];
            const guesses = row.solved ? row.guess_count : 7;
            percentile = getPercentile(cumulative, individual, guesses);
        } else {
            const guesses = row.solved ? row.guess_count : 7;
            percentile = getFallbackPercentile(guesses);
        }

        const existing = userGames.get(row.user_id) || [];
        existing.push(percentile);
        userGames.set(row.user_id, existing);
    }

    // Filter by min games and compute averages
    const entries: LeaderboardEntry[] = [];
    for (const [userId, percentiles] of userGames) {
        if (percentiles.length < minGames) continue;

        const avg = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;

        // Get latest username/avatar from sessions
        const userRow = db.prepare(
            'SELECT user_id, username, avatar FROM wordle_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        ).get(userId) as LeaderboardUserRow | undefined;

        entries.push({
            userId,
            username: userRow?.username || userId,
            avatar: userRow?.avatar || null,
            avgPercentile: Math.round(avg * 10) / 10,
            games: percentiles.length,
            currentStreak: getCurrentStreak(userId),
        });
    }

    entries.sort((a, b) => a.avgPercentile - b.avgPercentile);
    return entries;
}
