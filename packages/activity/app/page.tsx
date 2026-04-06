'use client';

import Link from 'next/link';
import { Text, Title, Loader, Stack, Button } from '@mantine/core';
import { useDiscordAuth, useGameState, useWordleSolution } from '@/lib/hooks';
import { getTodayEST } from '@/lib/wordle';
import { getLandingCopy } from '@/lib/landing';
import WordleIcon from '@/components/WordleIcon';
import classes from './page.module.css';

export default function Home() {
    const { data: auth, isLoading: authLoading, error } = useDiscordAuth();
    const { data: puzzle, isLoading: puzzleLoading } = useWordleSolution();
    const today = getTodayEST();
    const { data: gameState, isLoading: gameLoading } = useGameState(auth?.user.id, today);

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
            <Stack align="center" gap="lg" className={classes.content}>
                <Title order={1} className={classes.title}>Dingle</Title>
                <WordleIcon />
                {puzzle && <Text size="sm" c="dimmed" fw={600}>#{puzzle.puzzleNumber}</Text>}
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
                <Text component={Link} href="/history" size="sm" c="dimmed" td="underline">
                    history
                </Text>
            </Stack>
        </div>
    );
}
