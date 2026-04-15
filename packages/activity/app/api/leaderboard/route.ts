import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db';

type TimeWindow = '1d' | '1w' | '1m' | '3m' | 'all';

function getDateCutoff(window: TimeWindow): string | null {
    if (window === 'all' || window === '1d') return null;

    const now = new Date();
    const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

    switch (window) {
        case '1w':
            est.setDate(est.getDate() - 7);
            break;
        case '1m':
            est.setMonth(est.getMonth() - 1);
            break;
        case '3m':
            est.setMonth(est.getMonth() - 3);
            break;
    }

    const year = est.getFullYear();
    const month = String(est.getMonth() + 1).padStart(2, '0');
    const day = String(est.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getYesterdayEST(): string {
    const now = new Date();
    const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    est.setDate(est.getDate() - 1);
    const year = est.getFullYear();
    const month = String(est.getMonth() + 1).padStart(2, '0');
    const day = String(est.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getMinGames(window: TimeWindow): number {
    switch (window) {
        case '1d': return 1;
        case '1w': return 3;
        default: return 7;
    }
}

const VALID_WINDOWS = new Set<TimeWindow>(['1d', '1w', '1m', '3m', 'all']);

export async function GET(request: NextRequest) {
    const window = (request.nextUrl.searchParams.get('window') || 'all') as TimeWindow;

    if (!VALID_WINDOWS.has(window)) {
        return NextResponse.json({ error: 'Invalid time window' }, { status: 400 });
    }

    const dateCutoff = getDateCutoff(window);
    const minGames = getMinGames(window);
    const exactDate = window === '1d' ? getYesterdayEST() : undefined;
    const entries = getLeaderboard(dateCutoff, minGames, exactDate);

    return NextResponse.json(entries);
}
