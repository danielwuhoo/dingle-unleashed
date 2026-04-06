import { NextResponse } from 'next/server';

function getTodayEST(): string {
    const now = new Date();
    const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = est.getFullYear();
    const month = String(est.getMonth() + 1).padStart(2, '0');
    const day = String(est.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function GET() {
    const date = getTodayEST();

    const response = await fetch(`https://www.nytimes.com/svc/wordle/v2/${date}.json`, {
        next: { revalidate: 3600 },
    });

    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch wordle' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ solution: data.solution.toLowerCase(), date, puzzleNumber: data.days_since_launch ?? data.id ?? 0 });
}
