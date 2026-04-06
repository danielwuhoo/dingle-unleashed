import { NextRequest, NextResponse } from 'next/server';
import { getSession, createSession, updateSessionMessageId, getGameState, upsertPuzzle, getPuzzleByDate } from '@/lib/db';
import { buildBoardEmbed, postMessage } from '@/lib/discord-api';

const WORDLE_CHANNEL_ID = process.env.DISCORD_WORDLE_CHANNEL_ID;

async function getSolution(date: string): Promise<{ solution: string; puzzleNumber: number } | null> {
    const cached = getPuzzleByDate(date);
    if (cached) return cached;

    const res = await fetch(`https://www.nytimes.com/svc/wordle/v2/${date}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const solution = data.solution.toLowerCase();
    const puzzleNumber = data.days_since_launch ?? data.id ?? 0;
    upsertPuzzle(puzzleNumber, date, solution);
    return { solution, puzzleNumber };
}

export async function POST(request: NextRequest) {
    const { user_id, date, username, avatar } = await request.json();

    if (!user_id || !date) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!WORDLE_CHANNEL_ID) {
        return NextResponse.json({ ok: true });
    }

    const puzzle = await getSolution(date);
    if (!puzzle) {
        return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
    }

    const existing = getSession(user_id, puzzle.puzzleNumber);
    if (existing?.messageId) {
        return NextResponse.json({ ok: true });
    }

    const session = existing ?? createSession(user_id, puzzle.puzzleNumber, WORDLE_CHANNEL_ID);
    const state = getGameState(user_id, puzzle.puzzleNumber);

    const user = { username: username || 'someone', userId: user_id, avatar };
    const embed = buildBoardEmbed(user, puzzle.puzzleNumber, state.guesses, puzzle.solution, state.gameStatus);

    const messageId = await postMessage(WORDLE_CHANNEL_ID, embed);
    if (messageId) {
        updateSessionMessageId(user_id, puzzle.puzzleNumber, messageId);
    }

    return NextResponse.json({ ok: true });
}
