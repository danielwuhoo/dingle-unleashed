'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader, Stack, Text, ActionIcon } from '@mantine/core';

import { useDiscordAuth, useLeaderboard } from '@/lib/hooks';
import classes from './leaderboard.module.css';

const TIME_WINDOWS = [
    { key: '1d', label: '1D' },
    { key: '1w', label: '1W' },
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: 'all', label: 'All' },
] as const;

const MEDALS = ['🥇', '🥈', '🥉'];

function getAvatarUrl(userId: string, avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

function ordinal(n: number): string {
    const rounded = Math.round(n);
    const s = ['th', 'st', 'nd', 'rd'];
    const v = rounded % 100;
    return rounded + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function LeaderboardPage() {
    const { data: auth, isLoading: authLoading } = useDiscordAuth();
    const [timeWindow, setTimeWindow] = useState('all');
    const { data: entries, isLoading: leaderboardLoading } = useLeaderboard(timeWindow);

    if (authLoading || leaderboardLoading) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Loader />
            </Stack>
        );
    }

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <ActionIcon
                    component={Link}
                    href="/"
                    variant="subtle"
                    color="gray"
                    size="lg"
                >
                    <span style={{ fontSize: '1.2rem' }}>&#8592;</span>
                </ActionIcon>
                <Text size="lg" fw={700}>Leaderboard</Text>
                <div style={{ width: 34 }} />
            </div>

            <div className={classes.windowSelector}>
                {TIME_WINDOWS.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`${classes.windowButton} ${timeWindow === key ? classes.windowButtonActive : ''}`}
                        onClick={() => setTimeWindow(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {!entries || entries.length === 0 ? (
                <Stack align="center" justify="center" flex={1}>
                    <Text c="dimmed">no rankings yet</Text>
                </Stack>
            ) : (
                <div className={classes.list}>
                    {entries.map((entry, idx) => {
                        const avatarUrl = getAvatarUrl(entry.userId, entry.avatar);
                        const isCurrentUser = entry.userId === auth?.user.id;
                        const rank = idx + 1;

                        return (
                            <div
                                key={entry.userId}
                                className={`${classes.row} ${isCurrentUser ? classes.rowHighlight : ''}`}
                            >
                                <span className={classes.rank}>
                                    {rank <= 3 ? MEDALS[rank - 1] : rank}
                                </span>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="" className={classes.avatar} />
                                ) : (
                                    <div className={classes.avatarPlaceholder} />
                                )}
                                <span className={classes.name}>{entry.username}</span>
                                <div className={classes.stats}>
                                    <span className={classes.percentile}>{ordinal(entry.avgPercentile)}</span>
                                    <span className={classes.games}>{entry.games} game{entry.games !== 1 ? 's' : ''}</span>
                                    {entry.currentStreak > 0 && (
                                        <span className={classes.streak}>🔥 {entry.currentStreak}d</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
