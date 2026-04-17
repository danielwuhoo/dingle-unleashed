'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader, Stack, Text, ActionIcon } from '@mantine/core';

import { useDiscordAuth, useLeaderboard, LeaderboardResponse, LeaderboardEntry, DayGroup } from '@/lib/hooks';
import { isEarlyAccessWindow } from '@/lib/wordle';
import classes from './leaderboard.module.css';

const BASE_TIME_WINDOWS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '1w', label: '1W' },
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: 'all', label: 'All' },
] as const;

const TOMORROW_WINDOW = { key: 'tomorrow', label: 'Tomorrow' } as const;

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

function DailyView({ groups, currentUserId }: { groups: DayGroup[]; currentUserId?: string }) {
    if (groups.length === 0) {
        return (
            <Stack align="center" justify="center" flex={1}>
                <Text c="dimmed">no results yet</Text>
            </Stack>
        );
    }

    return (
        <div className={classes.groups}>
            {groups.map((group) => (
                <div key={group.guessCount} className={classes.group}>
                    <div className={classes.groupHeader}>
                        <Text fw={700} size="sm">
                            {group.guessCount <= 6 ? `${group.guessCount}/6` : 'X/6'}
                        </Text>
                        {group.percentile !== undefined && (
                            <Text size="xs" c="dimmed">
                                {ordinal(group.percentile)} percentile
                            </Text>
                        )}
                    </div>
                    <div className={classes.groupPlayers}>
                        {group.players.map((player) => {
                            const avatarUrl = getAvatarUrl(player.userId, player.avatar);
                            const isCurrentUser = player.userId === currentUserId;

                            return (
                                <div key={player.userId} className={classes.groupPlayer}>
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt=""
                                            className={`${classes.groupAvatar} ${isCurrentUser ? classes.groupAvatarHighlight : ''}`}
                                        />
                                    ) : (
                                        <div className={`${classes.groupAvatarPlaceholder} ${isCurrentUser ? classes.groupAvatarHighlight : ''}`} />
                                    )}
                                    <span className={`${classes.groupName} ${isCurrentUser ? classes.groupNameHighlight : ''}`}>
                                        {player.username}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function RankedView({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
    if (entries.length === 0) {
        return (
            <Stack align="center" justify="center" flex={1}>
                <Text c="dimmed">no rankings yet</Text>
            </Stack>
        );
    }

    return (
        <div className={classes.list}>
            {entries.map((entry, idx) => {
                const avatarUrl = getAvatarUrl(entry.userId, entry.avatar);
                const isCurrentUser = entry.userId === currentUserId;
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
    );
}

export default function LeaderboardPage() {
    const { data: auth, isLoading: authLoading } = useDiscordAuth();
    const [timeWindow, setTimeWindow] = useState('today');
    const timeWindows = useMemo(
        () => (isEarlyAccessWindow() ? [TOMORROW_WINDOW, ...BASE_TIME_WINDOWS] : BASE_TIME_WINDOWS),
        [],
    );
    const { data, isLoading: leaderboardLoading } = useLeaderboard(timeWindow);

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
                {timeWindows.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`${classes.windowButton} ${timeWindow === key ? classes.windowButtonActive : ''}`}
                        onClick={() => setTimeWindow(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {data && (data as LeaderboardResponse).type === 'daily' ? (
                <DailyView
                    groups={(data as Extract<LeaderboardResponse, { type: 'daily' }>).groups}
                    currentUserId={auth?.user.id}
                />
            ) : data && (data as LeaderboardResponse).type === 'ranked' ? (
                <RankedView
                    entries={(data as Extract<LeaderboardResponse, { type: 'ranked' }>).entries}
                    currentUserId={auth?.user.id}
                />
            ) : (
                <Stack align="center" justify="center" flex={1}>
                    <Text c="dimmed">no rankings yet</Text>
                </Stack>
            )}
        </div>
    );
}
