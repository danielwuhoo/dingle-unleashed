import { NextRequest, NextResponse } from 'next/server';
import { getCurrentStreak } from '@/lib/db';

export async function GET(request: NextRequest) {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    const streak = getCurrentStreak(userId);
    return NextResponse.json({ streak });
}
