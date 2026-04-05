'use client';

import { Text, Loader, Stack } from '@mantine/core';
import { useDiscordAuth } from '@/lib/hooks';
import WordlePage from './wordle/page';

export default function Home() {
    const { data: auth, isLoading, error } = useDiscordAuth();

    if (isLoading) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Loader />
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

    return <WordlePage />;
}
