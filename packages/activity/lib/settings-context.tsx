'use client';

import { createContext, useContext, useEffect, useCallback } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { useDiscordAuth, useSettings, useUpdateSettings } from './hooks';

interface SettingsContextValue {
    colorblind: boolean;
    lightMode: boolean;
    setColorblind: (v: boolean) => void;
    setLightMode: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
    colorblind: false,
    lightMode: false,
    setColorblind: () => {},
    setLightMode: () => {},
});

export const useSettingsContext = () => useContext(SettingsContext);

const DARK = {
    '--color-correct': '#a6da95',
    '--color-present': '#eed49f',
    '--color-absent': '#6e738d',
    '--color-bg': '#24273a',
    '--color-surface': '#363a4f',
    '--color-text': '#cad3f5',
    '--color-text-dimmed': '#8087a2',
    '--color-border': '#5b6078',
    '--color-key-bg': '#5b6078',
};

const LIGHT = {
    '--color-correct': '#a6da95',
    '--color-present': '#eed49f',
    '--color-absent': '#6e738d',
    '--color-bg': '#eff1f5',
    '--color-surface': '#dce0e8',
    '--color-text': '#4c4f69',
    '--color-text-dimmed': '#6c6f85',
    '--color-border': '#9ca0b0',
    '--color-key-bg': '#bcc0cc',
};

const COLORBLIND_OVERRIDES = {
    '--color-correct': '#8aadf4',
    '--color-present': '#f5a97f',
};

function applyVars(colorblind: boolean, lightMode: boolean) {
    const root = document.documentElement;
    const base = lightMode ? LIGHT : DARK;

    for (const [key, value] of Object.entries(base)) {
        root.style.setProperty(key, value);
    }

    if (colorblind) {
        for (const [key, value] of Object.entries(COLORBLIND_OVERRIDES)) {
            root.style.setProperty(key, value);
        }
    }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { data: auth } = useDiscordAuth();
    const userId = auth?.user.id;
    const { data: settings } = useSettings(userId);
    const updateMutation = useUpdateSettings();
    const { setColorScheme } = useMantineColorScheme();

    const colorblind = settings?.colorblind ?? false;
    const lightMode = settings?.lightMode ?? false;

    useEffect(() => {
        applyVars(colorblind, lightMode);
        setColorScheme(lightMode ? 'light' : 'dark');
    }, [colorblind, lightMode, setColorScheme]);

    const setColorblind = useCallback((v: boolean) => {
        if (!userId) return;
        updateMutation.mutate({ userId, colorblind: v });
    }, [userId, updateMutation]);

    const setLightMode = useCallback((v: boolean) => {
        if (!userId) return;
        updateMutation.mutate({ userId, lightMode: v });
    }, [userId, updateMutation]);

    return (
        <SettingsContext.Provider value={{ colorblind, lightMode, setColorblind, setLightMode }}>
            {children}
        </SettingsContext.Provider>
    );
}
