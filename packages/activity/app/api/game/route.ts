import { NextRequest, NextResponse } from 'next/server';
import { getGameState, insertGuess, upsertPuzzle, getPuzzleByDate, getSession } from '@/lib/db';
import { buildBoardEmbed, editMessage } from '@/lib/discord-api';
import { words } from '@/lib/words';

const MAX_GUESSES = 6;
const wordSet = new Set(words);

let solutionCache: { date: string; solution: string; puzzleNumber: number } | null = null;

async function getSolution(date: string): Promise<{ solution: string; puzzleNumber: number }> {
    if (solutionCache && solutionCache.date === date) {
        return solutionCache;
    }

    // Check DB first
    const cached = getPuzzleByDate(date);
    if (cached) {
        solutionCache = { date, solution: cached.solution, puzzleNumber: cached.puzzleNumber };
        return solutionCache;
    }

    const res = await fetch(`https://www.nytimes.com/svc/wordle/v2/${date}.json`);
    if (!res.ok) throw new Error('Failed to fetch puzzle');
    const data = await res.json();
    const solution = data.solution.toLowerCase();
    const puzzleNumber = data.days_since_launch ?? data.id ?? 0;

    upsertPuzzle(puzzleNumber, date, solution);
    solutionCache = { date, solution, puzzleNumber };
    return solutionCache;
}

export async function GET(request: NextRequest) {
    const userId = request.headers.get('x-user-id');
    const date = request.nextUrl.searchParams.get('date');

    if (!userId || !date) {
        return NextResponse.json({ error: 'Missing user_id or date' }, { status: 400 });
    }

    const { puzzleNumber } = await getSolution(date);
    const state = getGameState(userId, puzzleNumber);
    return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { user_id, date, word } = body;

    if (!user_id || !date || !word) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lowerWord = word.toLowerCase();

    if (!wordSet.has(lowerWord)) {
        return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
    }

    const { solution, puzzleNumber } = await getSolution(date);

    const current = getGameState(user_id, puzzleNumber);
    if (current.gameStatus !== 'playing') {
        return NextResponse.json({ error: 'Game is already over' }, { status: 400 });
    }
    if (current.guesses.length >= MAX_GUESSES) {
        return NextResponse.json({ error: 'No guesses remaining' }, { status: 400 });
    }

    const guessNumber = current.guesses.length + 1;
    const isSolution = lowerWord === solution;

    insertGuess(user_id, puzzleNumber, guessNumber, lowerWord, isSolution);

    const updated = getGameState(user_id, puzzleNumber);

    // Update Discord message if session exists
    const session = getSession(user_id, puzzleNumber);
    if (session?.messageId) {
        const user = { username: body.username || 'someone', userId: user_id, avatar: body.avatar };
        const embed = buildBoardEmbed(user, puzzleNumber, updated.guesses, solution, updated.gameStatus);
        editMessage(session.channelId, session.messageId, embed).catch(() => {});
    }

    return NextResponse.json(updated);
}
