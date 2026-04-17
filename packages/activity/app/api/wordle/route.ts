import { NextRequest, NextResponse } from 'next/server';
import { getTodayEST, getTomorrowEST, isEarlyAccessWindow } from '@/lib/wordle';

export async function GET(request: NextRequest) {
    const requested = request.nextUrl.searchParams.get('date');
    const today = getTodayEST();
    const tomorrow = isEarlyAccessWindow() ? getTomorrowEST() : null;

    let date: string;
    if (!requested) {
        date = today;
    } else if (requested === today || (tomorrow && requested === tomorrow)) {
        date = requested;
    } else {
        return NextResponse.json({ error: 'Puzzle not accessible' }, { status: 403 });
    }

    const response = await fetch(`https://www.nytimes.com/svc/wordle/v2/${date}.json`, {
        next: { revalidate: 3600 },
    });

    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch wordle' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ solution: data.solution.toLowerCase(), date, puzzleNumber: data.days_since_launch ?? data.id ?? 0 });
}
