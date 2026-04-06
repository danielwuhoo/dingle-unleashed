import { NextRequest, NextResponse } from 'next/server';
import { getPuzzleByDate, getDailySummary } from '@/lib/db';
import { buildSummaryEmbed, postMessage } from '@/lib/discord-api';

const WORDLE_CHANNEL_ID = process.env.DISCORD_WORDLE_CHANNEL_ID;
const SUMMARY_SECRET = process.env.SUMMARY_SECRET;

function getYesterdayEST(): string {
    const now = new Date();
    const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    est.setDate(est.getDate() - 1);
    const year = est.getFullYear();
    const month = String(est.getMonth() + 1).padStart(2, '0');
    const day = String(est.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
    if (SUMMARY_SECRET) {
        const secret = request.headers.get('x-summary-secret');
        if (secret !== SUMMARY_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (!WORDLE_CHANNEL_ID) {
        return NextResponse.json({ error: 'DISCORD_WORDLE_CHANNEL_ID not set' }, { status: 500 });
    }

    const yesterday = getYesterdayEST();
    const puzzle = getPuzzleByDate(yesterday);

    if (!puzzle) {
        return NextResponse.json({ error: `No puzzle found for ${yesterday}` }, { status: 404 });
    }

    const results = getDailySummary(puzzle.puzzleNumber);
    const embed = buildSummaryEmbed(puzzle.puzzleNumber, results);
    const messageId = await postMessage(WORDLE_CHANNEL_ID, embed);

    return NextResponse.json({
        ok: true,
        date: yesterday,
        puzzleNumber: puzzle.puzzleNumber,
        playerCount: results.length,
        messageId,
    });
}
