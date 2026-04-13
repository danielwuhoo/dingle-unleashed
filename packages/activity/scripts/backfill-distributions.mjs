#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';

const PUZZLE_DATA_URL = 'https://engaging-data.com/pages/scripts/wordlebot/wordlepuzzles.js';
const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'dingle.db');

async function fetchDistributions() {
    const response = await fetch(PUZZLE_DATA_URL);
    const text = await response.text();
    const jsonStr = text.replace(/^(?:var\s+)?wordlepuzzles\s*=\s*/, '').replace(/;\s*$/, '');
    const data = JSON.parse(jsonStr);

    const distributions = new Map();
    for (const [key, value] of Object.entries(data)) {
        const puzzleNum = parseInt(key, 10);
        if (!isNaN(puzzleNum) && value.cumulative && value.individual) {
            distributions.set(puzzleNum, {
                cumulative: value.cumulative,
                individual: value.individual,
            });
        }
    }
    return distributions;
}

async function main() {
    console.log(`Using DB: ${dbPath}`);
    const db = new Database(dbPath);

    // Ensure columns exist
    try { db.exec('ALTER TABLE wordle_puzzles ADD COLUMN cumulative TEXT'); } catch {}
    try { db.exec('ALTER TABLE wordle_puzzles ADD COLUMN individual TEXT'); } catch {}

    const puzzles = db.prepare(
        `SELECT puzzle_number, puzzle_date FROM wordle_puzzles
         WHERE puzzle_date >= date('now', '-30 days')
         ORDER BY puzzle_date DESC`
    ).all();

    console.log(`Found ${puzzles.length} puzzles in the last 30 days`);

    console.log('Fetching distributions from engaging-data.com...');
    const distributions = await fetchDistributions();
    console.log(`Loaded distributions for ${distributions.size} puzzles`);

    const update = db.prepare(
        'UPDATE wordle_puzzles SET cumulative = ?, individual = ? WHERE puzzle_number = ?'
    );

    let updated = 0;
    let skipped = 0;
    for (const puzzle of puzzles) {
        const dist = distributions.get(puzzle.puzzle_number);
        if (dist) {
            update.run(JSON.stringify(dist.cumulative), JSON.stringify(dist.individual), puzzle.puzzle_number);
            console.log(`  #${puzzle.puzzle_number} (${puzzle.puzzle_date}) — updated`);
            updated++;
        } else {
            console.log(`  #${puzzle.puzzle_number} (${puzzle.puzzle_date}) — no distribution available`);
            skipped++;
        }
    }

    console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
    db.close();
}

main().catch(console.error);
