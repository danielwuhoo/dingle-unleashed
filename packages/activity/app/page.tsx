'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Text, Title, Loader, Stack, Button, Modal, Switch, Group } from '@mantine/core';
import { useDiscordAuth, useGameState, useWordleSolution, useStreak } from '@/lib/hooks';
import { useSettingsContext } from '@/lib/settings-context';
import { getAccessiblePuzzleDates } from '@/lib/wordle';
import { getLandingCopy } from '@/lib/landing';
import WordleIcon from '@/components/WordleIcon';
import classes from './page.module.css';

export default function Home() {
    const { data: auth, isLoading: authLoading, error } = useDiscordAuth();
    const { today, tomorrow } = getAccessiblePuzzleDates();

    const { data: todayPuzzle, isLoading: todayPuzzleLoading } = useWordleSolution();
    const { data: tomorrowPuzzle, isLoading: tomorrowPuzzleLoading } = useWordleSolution(tomorrow ?? undefined);
    const { data: todayState, isLoading: todayStateLoading } = useGameState(auth?.user.id, today);
    const { data: tomorrowState, isLoading: tomorrowStateLoading } = useGameState(auth?.user.id, tomorrow ?? undefined);

    const { data: streakData } = useStreak(auth?.user.id);
    const streak = streakData?.streak ?? 0;
    const { colorblind, lightMode, setColorblind, setLightMode } = useSettingsContext();
    const [settingsOpen, setSettingsOpen] = useState(false);

    const puzzleLoading = todayPuzzleLoading || (!!tomorrow && tomorrowPuzzleLoading);
    const gameLoading = todayStateLoading || (!!tomorrow && tomorrowStateLoading);

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
    const showBothCards = !!tomorrow;

    const todayCopy = getLandingCopy(todayState);
    const tomorrowCopy = getLandingCopy(tomorrowState);

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
                {streak > 0 && (
                    <Text size="sm" fw={700} c="#f5a97f">
                        🔥 {streak} day streak
                    </Text>
                )}
                <Text size="xl" fw={700}>hey {name}</Text>

                {showBothCards ? (
                    <Group gap="md" justify="center" align="stretch" wrap="nowrap">
                        <Stack align="center" gap={6} className={classes.card}>
                            <Text size="sm" fw={700}>today</Text>
                            {todayPuzzle && <Text size="xs" c="dimmed" fw={600}>#{todayPuzzle.puzzleNumber}</Text>}
                            <Text size="xs" c="dimmed" ta="center">{todayCopy.subtitle}</Text>
                            <Button
                                className={classes.button}
                                component={Link}
                                href={`/wordle?date=${today}`}
                                size="md"
                                radius="md"
                                color="mauve"
                            >
                                {todayCopy.buttonText}
                            </Button>
                        </Stack>
                        <Stack align="center" gap={6} className={classes.card}>
                            <Text size="sm" fw={700}>tomorrow</Text>
                            {tomorrowPuzzle && <Text size="xs" c="dimmed" fw={600}>#{tomorrowPuzzle.puzzleNumber}</Text>}
                            <Text size="xs" c="dimmed" ta="center">{tomorrowCopy.subtitle}</Text>
                            <Button
                                className={classes.button}
                                component={Link}
                                href={`/wordle?date=${tomorrow}`}
                                size="md"
                                radius="md"
                                color="mauve"
                            >
                                {tomorrowCopy.buttonText}
                            </Button>
                        </Stack>
                    </Group>
                ) : (
                    <>
                        {todayPuzzle && <Text size="sm" c="dimmed" fw={600}>#{todayPuzzle.puzzleNumber}</Text>}
                        <Text size="md" c="dimmed">{todayCopy.subtitle}</Text>
                        <Button
                            className={classes.button}
                            component={Link}
                            href="/wordle"
                            size="lg"
                            radius="md"
                            color="mauve"
                        >
                            {todayCopy.buttonText}
                        </Button>
                    </>
                )}

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
