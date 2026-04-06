import { NextRequest, NextResponse } from 'next/server';
import { getSessionsForPuzzle, getGameState, getPuzzleByDate } from '@/lib/db';
import { getLetterStates, LetterState } from '@/lib/wordle-utils';

export async function GET(request: NextRequest) {
    const date = request.nextUrl.searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: 'Missing date' }, { status: 400 });
    }

    const puzzle = getPuzzleByDate(date);
    if (!puzzle) {
        return NextResponse.json([]);
    }

    const sessions = getSessionsForPuzzle(puzzle.puzzleNumber);
    const players = sessions.map((session) => {
        const state = getGameState(session.userId, puzzle.puzzleNumber);
        const rows: LetterState[][] = state.guesses.map((g) => getLetterStates(g, puzzle.solution));

        return {
            userId: session.userId,
            username: session.username,
            avatar: session.avatar,
            rows,
            gameStatus: state.gameStatus,
        };
    });

    return NextResponse.json(players);
}
