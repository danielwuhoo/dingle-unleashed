'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';
import { createDiscordSdk, isRunningInDiscord } from '@/lib/discord';

interface DiscordUser {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    discriminator: string;
}

interface DiscordAuth {
    user: DiscordUser;
    accessToken: string;
}

const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;

let discordSdk: DiscordSDK | DiscordSDKMock | null = null;

function getDiscordSdk() {
    if (!discordSdk) {
        discordSdk = createDiscordSdk(clientId);
    }
    return discordSdk;
}

async function authenticateWithDiscord(): Promise<DiscordAuth> {
    const sdk = getDiscordSdk();
    const inDiscord = isRunningInDiscord();

    if (sdk instanceof DiscordSDKMock) {
        sdk.emitReady();
    }
    await sdk.ready();

    const { code } = await sdk.commands.authorize({
        client_id: clientId,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: ['identify', 'guilds'],
    });

    if (!inDiscord) {
        const auth = await sdk.commands.authenticate({ access_token: 'mock_token' });
        return {
            user: auth.user as DiscordUser,
            accessToken: 'mock_token',
        };
    }

    const tokenRes = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    const { access_token } = await tokenRes.json();

    await sdk.commands.authenticate({ access_token });

    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
    });
    const user: DiscordUser = await userRes.json();

    return { user, accessToken: access_token };
}

export function useDiscordAuth() {
    return useQuery({
        queryKey: ['discord-auth'],
        queryFn: authenticateWithDiscord,
        staleTime: Infinity,
        retry: false,
    });
}

export function useWordleSolution() {
    return useQuery({
        queryKey: ['wordle-solution'],
        queryFn: async (): Promise<{ solution: string; date: string; puzzleNumber: number }> => {
            const res = await fetch('/api/wordle');
            return res.json();
        },
        staleTime: Infinity,
        retry: false,
    });
}

interface GameState {
    guesses: string[];
    gameStatus: 'playing' | 'won' | 'lost';
}

export function useGameState(userId: string | undefined, date: string | undefined) {
    return useQuery({
        queryKey: ['game-state', userId, date],
        queryFn: async (): Promise<GameState> => {
            const res = await fetch(`/api/game?date=${date}`, {
                headers: { 'x-user-id': userId! },
            });
            return res.json();
        },
        enabled: !!userId && !!date,
        staleTime: Infinity,
    });
}

export function useSubmitGuess() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { userId: string; date: string; word: string; username?: string; avatar?: string | null }): Promise<GameState> => {
            const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: params.userId,
                    date: params.date,
                    word: params.word,
                    username: params.username,
                    avatar: params.avatar,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to submit guess');
            }
            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(['game-state', variables.userId, variables.date], data);
        },
    });
}

export function useStartGame() {
    return useMutation({
        mutationFn: async (params: { userId: string; date: string; username: string; avatar?: string | null }): Promise<void> => {
            await fetch('/api/game/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: params.userId,
                    date: params.date,
                    username: params.username,
                    avatar: params.avatar,
                }),
            });
        },
    });
}

import { LetterState } from './wordle-utils';

interface PlayerInfo {
    userId: string;
    username: string;
    avatar: string | null;
    rows: LetterState[][];
    guesses: string[];
    gameStatus: 'playing' | 'won' | 'lost';
}

export function useAllPlayers(date: string | undefined) {
    return useQuery({
        queryKey: ['all-players', date],
        queryFn: async (): Promise<PlayerInfo[]> => {
            const res = await fetch(`/api/game/players?date=${date}`);
            return res.json();
        },
        enabled: !!date,
        refetchInterval: 30000,
    });
}

interface PastGame {
    guesses: string[];
    gameStatus: 'playing' | 'won' | 'lost';
    solution: string;
    puzzleNumber: number;
    puzzleDate: string;
}

export function usePastGame(userId: string | undefined, date: string | undefined) {
    return useQuery({
        queryKey: ['past-game', userId, date],
        queryFn: async (): Promise<PastGame> => {
            const res = await fetch(`/api/game/past?date=${date}`, {
                headers: { 'x-user-id': userId! },
            });
            return res.json();
        },
        enabled: !!userId && !!date,
        staleTime: Infinity,
    });
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    avatar: string | null;
    avgPercentile: number;
    games: number;
}

export function useLeaderboard(timeWindow: string) {
    return useQuery({
        queryKey: ['leaderboard', timeWindow],
        queryFn: async (): Promise<LeaderboardEntry[]> => {
            const res = await fetch(`/api/leaderboard?window=${timeWindow}`);
            return res.json();
        },
    });
}

interface HistoryEntry {
    puzzleDate: string;
    puzzleNumber: number;
    guesses: string[];
    solution: string;
    gameStatus: 'playing' | 'won' | 'lost';
}

export function useHistory(userId: string | undefined) {
    return useQuery({
        queryKey: ['history', userId],
        queryFn: async (): Promise<HistoryEntry[]> => {
            const res = await fetch('/api/history', {
                headers: { 'x-user-id': userId! },
            });
            return res.json();
        },
        enabled: !!userId,
    });
}
