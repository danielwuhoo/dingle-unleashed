import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { code } = await request.json();

    const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
            client_secret: process.env.DISCORD_CLIENT_SECRET!,
        }),
    });

    const data = await response.json();
    return NextResponse.json({ access_token: data.access_token });
}
