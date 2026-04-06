import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/db';

export async function GET(request: NextRequest) {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const history = getHistory(userId);
    return NextResponse.json(history);
}
