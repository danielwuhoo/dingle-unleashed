import { NextRequest, NextResponse } from 'next/server';
import { getPastGame } from '@/lib/db';

export async function GET(request: NextRequest) {
    const userId = request.headers.get('x-user-id');
    const date = request.nextUrl.searchParams.get('date');

    if (!userId || !date) {
        return NextResponse.json({ error: 'Missing user_id or date' }, { status: 400 });
    }

    const pastGame = getPastGame(userId, date);
    if (!pastGame) {
        return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    return NextResponse.json(pastGame);
}
