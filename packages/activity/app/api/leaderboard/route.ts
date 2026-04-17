import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getDayResults } from '@/lib/db';
import { getTodayEST, getTomorrowEST, isEarlyAccessWindow } from '@/lib/wordle';

type TimeWindow = 'tomorrow' | 'today' | 'yesterday' | '1w' | '1m' | '3m' | 'all';

function getDateCutoff(window: TimeWindow): string | null {
    if (window === 'all') return null;

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
    const today = getTodayEST();
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

function getMinGames(window: TimeWindow): number {
    switch (window) {
        case '1w': return 3;
        default: return 7;
    }
}

const VALID_WINDOWS = new Set<TimeWindow>(['tomorrow', 'today', 'yesterday', '1w', '1m', '3m', 'all']);

export async function GET(request: NextRequest) {
    const window = (request.nextUrl.searchParams.get('window') || 'today') as TimeWindow;

    if (!VALID_WINDOWS.has(window)) {
        return NextResponse.json({ error: 'Invalid time window' }, { status: 400 });
    }

    if (window === 'tomorrow') {
        if (!isEarlyAccessWindow()) {
            return NextResponse.json({ error: 'Tomorrow leaderboard not yet available' }, { status: 403 });
        }
        const date = getTomorrowEST();
        const groups = getDayResults(date, false);
        return NextResponse.json({ type: 'daily', date, groups });
    }

    if (window === 'today') {
        const date = getTodayEST();
        const groups = getDayResults(date, false);
        return NextResponse.json({ type: 'daily', date, groups });
    }

    if (window === 'yesterday') {
        const date = getYesterdayEST();
        const groups = getDayResults(date, true);
        return NextResponse.json({ type: 'daily', date, groups });
    }

    const dateCutoff = getDateCutoff(window);
    const minGames = getMinGames(window);
    const entries = getLeaderboard(dateCutoff, minGames);

    return NextResponse.json({ type: 'ranked', entries });
}
