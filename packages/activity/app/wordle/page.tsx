'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ActionIcon, Loader, Modal, Stack, Text } from '@mantine/core';
import { useDiscordAuth, useWordleSolution, useGameState, useSubmitGuess, useStartGame, useAllPlayers, usePastGame } from '@/lib/hooks';
import { words } from '@/lib/words';
import { getEndgameContent } from '@/lib/endgame';
import { GameStatus } from '@/lib/wordle';
import { getLetterStates, LetterState } from '@/lib/wordle-utils';
import { useSocket, useMockSocket, SpectatorPlayer } from '@/lib/socket-client';
import SpectatorPanel from '@/components/SpectatorPanel';
import classes from './wordle.module.css';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
];

const wordSet = new Set(words);

function getKeyboardStates(guesses: string[], solution: string): Map<string, LetterState> {
    const map = new Map<string, LetterState>();
    const priority: Record<LetterState, number> = { correct: 2, present: 1, absent: 0 };

    for (const guess of guesses) {
        const states = getLetterStates(guess, solution);
        for (let i = 0; i < WORD_LENGTH; i++) {
            const letter = guess[i];
            const current = map.get(letter);
            if (!current || priority[states[i]] > priority[current]) {
                map.set(letter, states[i]);
            }
        }
    }

    return map;
}

export default function WordlePage() {
    const searchParams = useSearchParams();
    const viewDate = searchParams.get('date');

    const { data: auth, isLoading: authLoading } = useDiscordAuth();

    if (viewDate) {
        return <PastView userId={auth?.user.id} date={viewDate} isLoading={authLoading} />;
    }

    return <LiveView auth={auth} isLoading={authLoading} />;
}

function PastView({ userId, date, isLoading: authLoading }: { userId: string | undefined; date: string; isLoading: boolean }) {
    const { data: pastGame, isLoading } = usePastGame(userId, date);

    if (authLoading || isLoading) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Loader />
            </Stack>
        );
    }

    if (!pastGame) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Text c="red">Puzzle not found</Text>
            </Stack>
        );
    }

    return (
        <ReadOnlyBoard
            guesses={pastGame.guesses}
            solution={pastGame.solution}
            puzzleNumber={pastGame.puzzleNumber}
            gameStatus={pastGame.gameStatus}
            backHref="/history"
        />
    );
}

function LiveView({ auth, isLoading: authLoading }: { auth: any; isLoading: boolean }) {
    const { data: puzzle, isLoading: puzzleLoading, error } = useWordleSolution();
    const { data: serverState, isLoading: gameLoading } = useGameState(auth?.user.id, puzzle?.date);
    const startGame = useStartGame();
    const startedRef = useRef(false);

    useEffect(() => {
        if (auth && puzzle && !startedRef.current) {
            startedRef.current = true;
            startGame.mutate({
                userId: auth.user.id,
                date: puzzle.date,
                username: auth.user.global_name ?? auth.user.username,
                avatar: auth.user.avatar,
            });
        }
    }, [auth?.user.id, puzzle?.date]); // eslint-disable-line react-hooks/exhaustive-deps

    if (authLoading || puzzleLoading || gameLoading) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Loader />
            </Stack>
        );
    }
    if (error || !puzzle || !auth) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Text c="red">Failed to load puzzle</Text>
            </Stack>
        );
    }

    return (
        <WordleGame
            solution={puzzle.solution}
            date={puzzle.date}
            puzzleNumber={puzzle.puzzleNumber}
            userId={auth.user.id}
            username={auth.user.global_name ?? auth.user.username}
            avatar={auth.user.avatar}
            initialGuesses={serverState?.guesses ?? []}
            initialStatus={serverState?.gameStatus ?? 'playing'}
        />
    );
}

function ReadOnlyBoard({ guesses, solution, puzzleNumber, gameStatus, backHref }: {
    guesses: string[];
    solution: string;
    puzzleNumber: number;
    gameStatus: GameStatus;
    backHref: string;
}) {
    const keyboardStates = getKeyboardStates(guesses, solution);

    return (
        <div className={classes.container}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 4px' }}>
                <ActionIcon component={Link} href={backHref} variant="subtle" color="gray" size="sm">
                    <span style={{ fontSize: '1rem' }}>&#8592;</span>
                </ActionIcon>
                <Text size="sm" c="dimmed" fw={600}>#{puzzleNumber}</Text>
                <div style={{ width: 22 }} />
            </div>

            <div className={classes.grid}>
                {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
                    const word = guesses[rowIdx] || '';
                    const isSubmitted = rowIdx < guesses.length;
                    const letterStates = isSubmitted ? getLetterStates(word, solution) : null;

                    return (
                        <div key={rowIdx} className={classes.row}>
                            {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
                                const letter = word[colIdx] || '';
                                const state = letterStates?.[colIdx];

                                let tileClass = classes.tile;
                                if (isSubmitted && state) {
                                    tileClass += ` ${classes[state]} ${classes.revealed}`;
                                }

                                return (
                                    <div key={colIdx} className={tileClass}>
                                        <span>{letter}</span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {gameStatus === 'lost' && (
                <Text size="md" c="dimmed" tt="uppercase" ta="center">{solution}</Text>
            )}

            <div className={classes.keyboard}>
                {KEYBOARD_ROWS.map((row, rowIdx) => (
                    <div key={rowIdx} className={classes.keyboardRow}>
                        {row.map((key) => {
                            const state = keyboardStates.get(key);
                            let keyClass = classes.key;
                            if (state) keyClass += ` ${classes[state]}`;
                            if (key === 'enter' || key === 'backspace') keyClass += ` ${classes.wideKey}`;

                            return (
                                <div key={key} className={keyClass}>
                                    {key === 'backspace' ? '⌫' : key}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface WordleGameProps {
    solution: string;
    date: string;
    puzzleNumber: number;
    userId: string;
    username: string;
    avatar?: string | null;
    initialGuesses: string[];
    initialStatus: GameStatus;
}

function WordleGame({ solution, date, puzzleNumber, userId, username, avatar, initialGuesses, initialStatus }: WordleGameProps) {
    const [guesses, setGuesses] = useState<string[]>(initialGuesses);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameStatus, setGameStatus] = useState<GameStatus>(initialStatus);
    const [revealingRow, setRevealingRow] = useState<number | null>(null);
    const [revealedTiles, setRevealedTiles] = useState<Set<string>>(new Set());
    const [shakeRow, setShakeRow] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(initialStatus !== 'playing');

    const submitGuessMutation = useSubmitGuess();
    const isDev = process.env.NODE_ENV === 'development';
    const socket = useSocket(isDev ? null : {
        userId, username, avatar, date,
        guesses: initialGuesses,
        gameStatus: initialStatus,
    });
    const mock = useMockSocket();
    const socketPlayers = isDev ? mock.players : socket.players;
    const emit = isDev ? mock.emit : socket.emit;
    const { data: dbPlayers } = useAllPlayers(date);

    const players = useMemo(() => {
        const merged = new Map<string, SpectatorPlayer>();
        // Add DB players first (offline baseline)
        if (dbPlayers) {
            for (const p of dbPlayers) {
                if (p.userId === userId) continue;
                merged.set(p.userId, {
                    userId: p.userId,
                    username: p.username,
                    avatar: p.avatar,
                    rows: p.rows,
                    gameStatus: p.gameStatus,
                    letterCount: 0,
                    shaking: false,
                    revealingRow: null,
                    isOnline: false,
                });
            }
        }
        // Overlay socket players (online, live data)
        for (const [, p] of socketPlayers) {
            if (p.userId === userId) continue;
            merged.set(p.userId, { ...p, isOnline: p.isOnline ?? true });
        }
        return merged;
    }, [dbPlayers, socketPlayers, userId]);

    const submitGuess = useCallback(() => {
        if (currentGuess.length !== WORD_LENGTH) return;
        if (!wordSet.has(currentGuess)) {
            setShakeRow(guesses.length);
            setTimeout(() => setShakeRow(null), 250);
            emit('shake');
            return;
        }

        const rowIndex = guesses.length;
        const newGuesses = [...guesses, currentGuess];
        setRevealingRow(rowIndex);
        setGuesses(newGuesses);
        setCurrentGuess('');

        const newStatus = currentGuess === solution ? 'won' : newGuesses.length >= MAX_GUESSES ? 'lost' : 'playing';
        emit('guess', { word: currentGuess, guesses: newGuesses, gameStatus: newStatus });

        submitGuessMutation.mutate({ userId, date, word: currentGuess, username, avatar });

        for (let i = 0; i < WORD_LENGTH; i++) {
            setTimeout(() => {
                setRevealedTiles((prev) => new Set(prev).add(`${rowIndex}-${i}`));
            }, i * 300 + 250);
        }

        const revealDuration = WORD_LENGTH * 300 + 500;
        setTimeout(() => {
            setRevealingRow(null);
            if (currentGuess === solution) {
                setGameStatus('won');
                setModalOpen(true);
            } else if (newGuesses.length >= MAX_GUESSES) {
                setGameStatus('lost');
                setModalOpen(true);
            }
        }, revealDuration);
    }, [currentGuess, guesses, solution, userId, date, submitGuessMutation]);

    const handleKey = useCallback((key: string) => {
        if (gameStatus !== 'playing') return;
        if (revealingRow !== null) return;

        if (key === 'enter') {
            submitGuess();
        } else if (key === 'backspace') {
            setCurrentGuess((prev) => {
                const next = prev.slice(0, -1);
                emit('typing', { letterCount: next.length });
                return next;
            });
        } else if (key.length === 1 && key >= 'a' && key <= 'z') {
            setCurrentGuess((prev) => {
                if (prev.length >= WORD_LENGTH) return prev;
                const next = prev + key;
                emit('typing', { letterCount: next.length });
                return next;
            });
        }
    }, [gameStatus, revealingRow, submitGuess, emit]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const key = e.key.toLowerCase();
            if (key === 'enter' || key === 'backspace' || (key.length === 1 && key >= 'a' && key <= 'z')) {
                handleKey(key);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleKey]);

    const completedGuesses = revealingRow !== null ? guesses.slice(0, revealingRow) : guesses;
    const keyboardStates = getKeyboardStates(completedGuesses, solution);

    const endgame = gameStatus !== 'playing' ? getEndgameContent(guesses.length, gameStatus === 'won') : null;

    return (
        <div className={classes.container}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 4px' }}>
                <ActionIcon component={Link} href="/" variant="subtle" color="gray" size="sm">
                    <span style={{ fontSize: '1rem' }}>&#8592;</span>
                </ActionIcon>
                <Text size="sm" c="dimmed" fw={600}>#{puzzleNumber}</Text>
                <div style={{ width: 22 }} />
            </div>

            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                centered
                withCloseButton
                size="sm"
                styles={{
                    content: { backgroundColor: '#24273a' },
                    header: { backgroundColor: '#24273a' },
                }}
            >
                {endgame && (
                    <Stack align="center" gap="md">
                        <img src={endgame.gif} alt="" className={classes.endgameGif} />
                        <Text size="xl" fw={700} ta="center">{endgame.text}</Text>
                        {gameStatus === 'lost' && (
                            <Text size="md" c="dimmed" tt="uppercase">{solution}</Text>
                        )}
                    </Stack>
                )}
            </Modal>

            <div className={classes.grid}>
                {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
                    const isSubmitted = rowIdx < guesses.length;
                    const isCurrentRow = rowIdx === guesses.length;
                    const isRevealing = revealingRow === rowIdx;
                    const isShaking = shakeRow === rowIdx;
                    const word = isSubmitted ? guesses[rowIdx] : isCurrentRow ? currentGuess : '';
                    const letterStates = isSubmitted ? getLetterStates(guesses[rowIdx], solution) : null;

                    return (
                        <div
                            key={rowIdx}
                            className={`${classes.row} ${isShaking ? classes.shake : ''}`}
                        >
                            {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
                                const letter = word[colIdx] || '';
                                const state = letterStates?.[colIdx];
                                const isFilled = letter !== '';
                                const tileRevealed = revealedTiles.has(`${rowIdx}-${colIdx}`);

                                let tileClass = classes.tile;
                                if (isSubmitted && state) {
                                    tileClass += ` ${classes[state]}`;
                                    if (tileRevealed || !isRevealing) {
                                        tileClass += ` ${classes.revealed}`;
                                    }
                                    if (isRevealing) {
                                        tileClass += ` ${classes.reveal}`;
                                    }
                                } else if (isFilled) {
                                    tileClass += ` ${classes.filled}`;
                                }

                                return (
                                    <div
                                        key={colIdx}
                                        className={tileClass}
                                        style={isRevealing ? { animationDelay: `${colIdx * 300}ms` } : undefined}
                                    >
                                        <span>{letter}</span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <SpectatorPanel players={players} />

            <div className={classes.keyboard}>
                {KEYBOARD_ROWS.map((row, rowIdx) => (
                    <div key={rowIdx} className={classes.keyboardRow}>
                        {row.map((key) => {
                            const state = keyboardStates.get(key);
                            let keyClass = classes.key;
                            if (state) keyClass += ` ${classes[state]}`;
                            if (key === 'enter' || key === 'backspace') keyClass += ` ${classes.wideKey}`;

                            return (
                                <button
                                    key={key}
                                    className={keyClass}
                                    onClick={() => handleKey(key)}
                                >
                                    {key === 'backspace' ? '⌫' : key}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
