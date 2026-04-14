import { NextRequest, NextResponse } from 'next/server';
import { getUserSettings, updateUserSettings } from '@/lib/db';

export async function GET(request: NextRequest) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }
    return NextResponse.json(getUserSettings(userId));
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { user_id, colorblind, lightMode } = body;
    if (!user_id) {
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }
    const updated = updateUserSettings(user_id, { colorblind, lightMode });
    return NextResponse.json(updated);
}
