'use client';

import { Text, Loader, Stack, Box } from '@mantine/core';
import { useDiscordAuth } from '@/lib/hooks';
import classes from './page.module.css';

export default function Home() {
    const { data: auth, isLoading, error } = useDiscordAuth();

    return (
        <Box className={classes.container}>
            <Stack align="center">
                {isLoading && <Loader />}
                {error && <Text c="red" size="lg">Error: {error.message}</Text>}
                {auth && (
                    <Text size="xl">
                        Hello, {auth.user.global_name ?? auth.user.username}!
                    </Text>
                )}
            </Stack>
        </Box>
    );
}
