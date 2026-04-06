'use client';

import Link from 'next/link';
import { Loader, Stack, Text, ActionIcon } from '@mantine/core';

import { useDiscordAuth, useHistory } from '@/lib/hooks';
import { getLetterStates } from '@/lib/wordle-utils';
import classes from './history.module.css';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
interface HistoryEntry {
    puzzleDate: string;
    puzzleNumber: number;
    guesses: string[];
    solution: string;
    gameStatus: 'playing' | 'won' | 'lost';
}

function MiniBoard({ guesses, solution }: { guesses: string[]; solution: string }) {
    return (
        <div className={classes.miniBoard}>
            {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
                const word = guesses[rowIdx];
                const states = word ? getLetterStates(word, solution) : null;

                return (
                    <div key={rowIdx} className={classes.miniRow}>
                        {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
                            let cellClass = classes.miniTile;
                            if (states) {
                                cellClass += ` ${classes[states[colIdx]]}`;
                            }
                            return <div key={colIdx} className={cellClass} />;
                        })}
                    </div>
                );
            })}
        </div>
    );
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

export default function HistoryPage() {
    const { data: auth, isLoading: authLoading } = useDiscordAuth();
    const { data: history, isLoading: historyLoading } = useHistory(auth?.user.id);

    if (authLoading || historyLoading) {
        return (
            <Stack align="center" justify="center" h="100vh">
                <Loader />
            </Stack>
        );
    }

    const completedGames = (history ?? [])
        .filter((e) => e.gameStatus !== 'playing')
        .sort((a, b) => b.puzzleDate.localeCompare(a.puzzleDate));

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <ActionIcon
                    component={Link}
                    href="/"
                    variant="subtle"
                    color="gray"
                    size="lg"
                >
                    <span style={{ fontSize: '1.2rem' }}>&#8592;</span>
                </ActionIcon>
                <Text size="lg" fw={700}>History</Text>
                <div style={{ width: 34 }} />
            </div>

            {completedGames.length === 0 ? (
                <Stack align="center" justify="center" flex={1}>
                    <Text c="dimmed">no puzzles yet</Text>
                </Stack>
            ) : (
                <div className={classes.grid}>
                    {completedGames.map((entry) => (
                        <Link key={entry.puzzleDate} href={`/wordle?date=${entry.puzzleDate}`} className={classes.cell}>
                            <Text size="xs" c="dimmed" ta="center">{formatDate(entry.puzzleDate)}</Text>
                            <MiniBoard guesses={entry.guesses} solution={entry.solution} />
                            <Text size="xs" ta="center" fw={600} c={entry.gameStatus === 'won' ? '#a6da95' : '#ed8796'}>
                                {entry.gameStatus === 'won' ? `${entry.guesses.length}/6` : 'X/6'}
                            </Text>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
