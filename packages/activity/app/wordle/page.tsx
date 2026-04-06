'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader, Modal, Stack, Text } from '@mantine/core';
import { useDiscordAuth, useWordleSolution, useGameState, useSubmitGuess } from '@/lib/hooks';
import { words } from '@/lib/words';
import { getEndgameContent } from '@/lib/endgame';
import { GameStatus } from '@/lib/wordle';
import classes from './wordle.module.css';

type LetterState = 'correct' | 'present' | 'absent';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
];

const wordSet = new Set(words);

function getLetterStates(guess: string, solution: string): LetterState[] {
    const states: LetterState[] = Array(WORD_LENGTH).fill('absent');
    const solutionChars = solution.split('');
    const remaining: (string | null)[] = [...solutionChars];

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === solutionChars[i]) {
            states[i] = 'correct';
            remaining[i] = null;
        }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (states[i] === 'correct') continue;
        const idx = remaining.indexOf(guess[i]);
        if (idx !== -1) {
            states[i] = 'present';
            remaining[idx] = null;
        }
    }

    return states;
}

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
    const { data: auth, isLoading: authLoading } = useDiscordAuth();
    const { data: puzzle, isLoading: puzzleLoading, error } = useWordleSolution();
    const { data: serverState, isLoading: gameLoading } = useGameState(auth?.user.id, puzzle?.date);

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
            initialGuesses={serverState?.guesses ?? []}
            initialStatus={serverState?.gameStatus ?? 'playing'}
        />
    );
}

interface WordleGameProps {
    solution: string;
    date: string;
    puzzleNumber: number;
    userId: string;
    initialGuesses: string[];
    initialStatus: GameStatus;
}

function WordleGame({ solution, date, puzzleNumber, userId, initialGuesses, initialStatus }: WordleGameProps) {
    const [guesses, setGuesses] = useState<string[]>(initialGuesses);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameStatus, setGameStatus] = useState<GameStatus>(initialStatus);
    const [revealingRow, setRevealingRow] = useState<number | null>(null);
    const [revealedTiles, setRevealedTiles] = useState<Set<string>>(new Set());
    const [shakeRow, setShakeRow] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(initialStatus !== 'playing');

    const submitGuessMutation = useSubmitGuess();

    const submitGuess = useCallback(() => {
        if (currentGuess.length !== WORD_LENGTH) return;
        if (!wordSet.has(currentGuess)) {
            setShakeRow(guesses.length);
            setTimeout(() => setShakeRow(null), 250);
            return;
        }

        const rowIndex = guesses.length;
        const newGuesses = [...guesses, currentGuess];
        setRevealingRow(rowIndex);
        setGuesses(newGuesses);
        setCurrentGuess('');

        submitGuessMutation.mutate({ userId, date, word: currentGuess });

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
            setCurrentGuess((prev) => prev.slice(0, -1));
        } else if (key.length === 1 && key >= 'a' && key <= 'z') {
            setCurrentGuess((prev) => (prev.length < WORD_LENGTH ? prev + key : prev));
        }
    }, [gameStatus, revealingRow, submitGuess]);

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
            <Text size="sm" c="dimmed" fw={600}>#{puzzleNumber}</Text>

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
