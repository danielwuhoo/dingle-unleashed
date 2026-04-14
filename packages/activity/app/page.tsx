'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Text, Title, Loader, Stack, Button, Modal, Switch } from '@mantine/core';
import { useDiscordAuth, useGameState, useWordleSolution, useStreak } from '@/lib/hooks';
import { useSettingsContext } from '@/lib/settings-context';
import { getTodayEST } from '@/lib/wordle';
import { getLandingCopy } from '@/lib/landing';
import WordleIcon from '@/components/WordleIcon';
import classes from './page.module.css';

export default function Home() {
    const { data: auth, isLoading: authLoading, error } = useDiscordAuth();
    const { data: puzzle, isLoading: puzzleLoading } = useWordleSolution();
    const today = getTodayEST();
    const { data: gameState, isLoading: gameLoading } = useGameState(auth?.user.id, today);
    const { data: streakData } = useStreak(auth?.user.id);
    const streak = streakData?.streak ?? 0;
    const { colorblind, lightMode, setColorblind, setLightMode } = useSettingsContext();
    const [settingsOpen, setSettingsOpen] = useState(false);

    if (authLoading || puzzleLoading || gameLoading) {
        return (
            <Stack align="center" justify="center" h="100vh" gap="md">
                <Loader />
                <Text size="sm" c="dimmed">connecting...</Text>
            </Stack>
        );
    }

    if (error) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Text c="red" size="lg">Error: {error.message}</Text>
            </Stack>
        );
    }

    const name = auth?.user.global_name ?? auth?.user.username ?? 'friend';
    const { subtitle, buttonText } = getLandingCopy(gameState);

    return (
        <div className={classes.container}>
            <Modal
                opened={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                centered
                withCloseButton
                size="xs"
                title="Settings"
            >
                <Stack gap="md">
                    <Switch
                        label="Colorblind mode"
                        checked={colorblind}
                        onChange={(e) => setColorblind(e.currentTarget.checked)}
                    />
                    <Switch
                        label="Light mode"
                        checked={lightMode}
                        onChange={(e) => setLightMode(e.currentTarget.checked)}
                    />
                </Stack>
            </Modal>

            <Stack align="center" gap="lg" className={classes.content}>
                <Title order={1} className={classes.title}>Dingle</Title>
                <WordleIcon />
                {puzzle && <Text size="sm" c="dimmed" fw={600}>#{puzzle.puzzleNumber}</Text>}
                {streak > 0 && (
                    <Text size="sm" fw={700} c="#f5a97f">
                        🔥 {streak} day streak
                    </Text>
                )}
                <Stack align="center" gap={4}>
                    <Text size="xl" fw={700}>hey {name}</Text>
                    <Text size="md" c="dimmed">{subtitle}</Text>
                </Stack>
                <Button
                    className={classes.button}
                    component={Link}
                    href="/wordle"
                    size="lg"
                    radius="md"
                    color="mauve"
                >
                    {buttonText}
                </Button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Text component={Link} href="/history" size="sm" c="dimmed" td="underline">
                        history
                    </Text>
                    <Text component={Link} href="/leaderboard" size="sm" c="dimmed" td="underline">
                        leaderboard
                    </Text>
                    <Text size="sm" c="dimmed" td="underline" style={{ cursor: 'pointer' }} onClick={() => setSettingsOpen(true)}>
                        settings
                    </Text>
                </div>
            </Stack>
        </div>
    );
}
