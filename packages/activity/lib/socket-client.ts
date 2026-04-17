'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { LetterState } from './wordle-utils';

export interface SpectatorPlayer {
    userId: string;
    username: string;
    avatar?: string | null;
    rows: LetterState[][];
    guesses: string[];
    currentWord: string;
    currentChars?: string[];
    gameStatus: 'playing' | 'won' | 'lost';
    letterCount: number;
    shaking: boolean;
    revealingRow: number | null;
    isOnline: boolean;
}

interface UseSocketOptions {
    userId: string;
    username: string;
    avatar?: string | null;
    date: string;
    guesses: string[];
    gameStatus: string;
}

export function useSocket(options: UseSocketOptions | null) {
    const [players, setPlayers] = useState<Map<string, SpectatorPlayer>>(new Map());
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!options) return;

        const socket = io({ path: '/api/socketio', transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join', {
                userId: options.userId,
                username: options.username,
                avatar: options.avatar,
                date: options.date,
                guesses: options.guesses,
                gameStatus: options.gameStatus,
            });
        });

        socket.on('room_state', (data: { players: SpectatorPlayer[] }) => {
            const map = new Map<string, SpectatorPlayer>();
            for (const p of data.players) {
                map.set(p.userId, { ...p, shaking: false, revealingRow: null, isOnline: true, guesses: p.guesses ?? [], currentWord: p.currentWord ?? '' });
            }
            setPlayers(map);
        });

        socket.on('player_joined', (player: SpectatorPlayer) => {
            setPlayers((prev) => {
                const next = new Map(prev);
                next.set(player.userId, { ...player, shaking: false, revealingRow: null, isOnline: true, guesses: player.guesses ?? [], currentWord: player.currentWord ?? '' });
                return next;
            });
        });

        socket.on('player_typing', (data: { userId: string; letterCount: number; currentWord: string; currentChars?: string[] }) => {
            setPlayers((prev) => {
                const next = new Map(prev);
                const player = next.get(data.userId);
                if (player) {
                    next.set(data.userId, { ...player, letterCount: data.letterCount, currentWord: data.currentWord, currentChars: data.currentChars });
                }
                return next;
            });
        });

        socket.on('player_guess', (data: { userId: string; row: LetterState[]; word: string; gameStatus: string }) => {
            setPlayers((prev) => {
                const next = new Map(prev);
                const player = next.get(data.userId);
                if (player) {
                    const revealingRow = player.rows.length;
                    next.set(data.userId, {
                        ...player,
                        rows: [...player.rows, data.row],
                        guesses: [...player.guesses, data.word],
                        gameStatus: data.gameStatus as SpectatorPlayer['gameStatus'],
                        letterCount: 0,
                        currentWord: '',
                        currentChars: undefined,
                        revealingRow,
                    });

                    // Clear revealing after animation
                    setTimeout(() => {
                        setPlayers((p) => {
                            const n = new Map(p);
                            const pl = n.get(data.userId);
                            if (pl && pl.revealingRow === revealingRow) {
                                n.set(data.userId, { ...pl, revealingRow: null });
                            }
                            return n;
                        });
                    }, 5 * 300 + 500);
                }
                return next;
            });
        });

        socket.on('player_shake', (data: { userId: string }) => {
            setPlayers((prev) => {
                const next = new Map(prev);
                const player = next.get(data.userId);
                if (player) {
                    next.set(data.userId, { ...player, shaking: true });
                }
                return next;
            });
            setTimeout(() => {
                setPlayers((prev) => {
                    const next = new Map(prev);
                    const player = next.get(data.userId);
                    if (player) {
                        next.set(data.userId, { ...player, shaking: false });
                    }
                    return next;
                });
            }, 250);
        });

        socket.on('player_left', (data: { userId: string }) => {
            setPlayers((prev) => {
                const next = new Map(prev);
                const player = next.get(data.userId);
                if (player) {
                    next.set(data.userId, { ...player, isOnline: false, letterCount: 0, currentWord: '', shaking: false, revealingRow: null });
                }
                return next;
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [options?.userId, options?.date]); // eslint-disable-line react-hooks/exhaustive-deps

    const emit = useCallback((event: string, data?: any) => {
        socketRef.current?.emit(event, data);
    }, []);

    return { players, emit };
}

// Mock spectators for dev mode
export function useMockSocket(): { players: Map<string, SpectatorPlayer>; emit: (event: string, data?: any) => void } {
    const [players, setPlayers] = useState<Map<string, SpectatorPlayer>>(new Map());
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const mockPlayers: SpectatorPlayer[] = [
            {
                userId: 'mock-1', username: 'sarah', avatar: null, shaking: false, revealingRow: null, isOnline: true,
                rows: [['absent','absent','present','absent','absent'],['correct','absent','absent','present','absent'],['correct','correct','correct','absent','present']],
                guesses: ['crane', 'story', 'stove'], currentWord: 'ste',
                gameStatus: 'playing', letterCount: 3,
            },
            {
                userId: 'mock-2', username: 'mike', avatar: null, shaking: false, revealingRow: null, isOnline: true,
                rows: [['absent','present','absent','absent','correct'],['present','absent','correct','absent','correct'],['correct','correct','correct','correct','correct']],
                guesses: ['crane', 'lusty', 'envoy'], currentWord: '',
                gameStatus: 'won', letterCount: 0,
            },
            {
                userId: 'mock-3', username: 'alex', avatar: null, shaking: false, revealingRow: null, isOnline: false,
                rows: [['absent','absent','absent','present','absent']],
                guesses: ['crane'], currentWord: '',
                gameStatus: 'playing', letterCount: 0,
            },
            {
                userId: 'mock-4', username: 'jordan', avatar: null, shaking: false, revealingRow: null, isOnline: true,
                rows: [['present','absent','absent','absent','present'],['absent','correct','present','absent','absent'],['correct','correct','absent','correct','absent'],['correct','correct','correct','correct','correct']],
                guesses: ['youth', 'snipe', 'envoi', 'envoy'], currentWord: '',
                gameStatus: 'won', letterCount: 0,
            },
            {
                userId: 'mock-5', username: 'taylor', avatar: null, shaking: false, revealingRow: null, isOnline: false,
                rows: [['absent','absent','correct','absent','absent'],['absent','present','correct','absent','present']],
                guesses: ['adieu', 'movie'], currentWord: 'enjo',
                gameStatus: 'playing', letterCount: 4,
            },
            {
                userId: 'mock-6', username: 'chris', avatar: null, shaking: false, revealingRow: null, isOnline: true,
                rows: [['absent','absent','absent','absent','absent'],['present','absent','absent','present','absent'],['absent','correct','present','absent','correct'],['correct','absent','correct','correct','correct'],['absent','correct','correct','correct','correct'],['present','absent','correct','absent','correct']],
                guesses: ['blind', 'youth', 'snowy', 'enjoy', 'annoy', 'envoy'], currentWord: '',
                gameStatus: 'lost', letterCount: 0,
            },
            {
                userId: 'mock-7', username: 'yaman', avatar: null, shaking: false, revealingRow: null, isOnline: false,
                rows: [],
                guesses: [], currentWord: 'c',
                gameStatus: 'playing', letterCount: 1,
            },
            {
                userId: 'mock-8', username: 'priya', avatar: null, shaking: false, revealingRow: null, isOnline: true,
                rows: [['present','absent','correct','absent','absent'],['correct','correct','correct','absent','correct']],
                guesses: ['ovary', 'envoi'], currentWord: 'en',
                gameStatus: 'playing', letterCount: 2,
            },
            {
                userId: 'mock-9', username: 'ben', avatar: null, shaking: false, revealingRow: null, isOnline: false,
                rows: [['absent','absent','absent','absent','present'],['absent','present','absent','correct','absent'],['present','correct','absent','correct','correct'],['correct','correct','correct','correct','correct']],
                guesses: ['slate', 'drown', 'onion', 'envoy'], currentWord: '',
                gameStatus: 'won', letterCount: 0,
            },
            {
                userId: 'mock-10', username: 'nina', avatar: null, shaking: false, revealingRow: null, isOnline: true,
                rows: [['absent','correct','absent','absent','absent']],
                guesses: ['snail'], currentWord: 'envoy',
                gameStatus: 'playing', letterCount: 5,
            },
        ];

        const map = new Map<string, SpectatorPlayer>();
        for (const p of mockPlayers) {
            map.set(p.userId, p);
        }
        setPlayers(map);

        // Simulate alex typing
        let letterCount = 0;
        const typingInterval = setInterval(() => {
            letterCount = (letterCount + 1) % 6;
            setPlayers((prev) => {
                const next = new Map(prev);
                const alex = next.get('mock-3');
                if (alex) {
                    next.set('mock-3', { ...alex, letterCount });
                }
                return next;
            });
        }, 800);

        return () => clearInterval(typingInterval);
    }, []);

    const emit = useCallback((_event: string, _data?: any) => {}, []);

    return { players, emit };
}
