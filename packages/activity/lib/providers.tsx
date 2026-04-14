'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { useState } from 'react';
import { theme } from './theme';
import { SettingsProvider } from './settings-context';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme} defaultColorScheme="dark">
                <SettingsProvider>
                    {children}
                </SettingsProvider>
            </MantineProvider>
        </QueryClientProvider>
    );
}
