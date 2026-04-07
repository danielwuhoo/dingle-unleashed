'use client';

import { useEffect, useRef, useState } from 'react';
import { Text } from '@mantine/core';
import { SpectatorPlayer } from '@/lib/socket-client';
import classes from './SpectatorPanel.module.css';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

function getAvatarUrl(userId: string, avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

function MiniSpectatorBoard({ player, showLetters }: { player: SpectatorPlayer; showLetters: boolean }) {
    const [revealedTiles, setRevealedTiles] = useState<Set<string>>(new Set());
    const prevRowCount = useRef(player.rows.length);

    useEffect(() => {
        if (player.rows.length > prevRowCount.current) {
            const rowIdx = player.rows.length - 1;
            for (let i = 0; i < WORD_LENGTH; i++) {
                setTimeout(() => {
                    setRevealedTiles((prev) => new Set(prev).add(`${rowIdx}-${i}`));
                }, i * 300 + 250);
            }
        }
        prevRowCount.current = player.rows.length;
    }, [player.rows.length]);

    return (
        <div className={classes.miniBoard}>
            {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
                const isSubmitted = rowIdx < player.rows.length;
                const isCurrentRow = rowIdx === player.rows.length && player.gameStatus === 'playing';
                const isRevealing = player.revealingRow === rowIdx;
                const isShaking = player.shaking && isCurrentRow;
                const states = isSubmitted ? player.rows[rowIdx] : null;
                const word = isSubmitted ? player.guesses[rowIdx] : isCurrentRow ? player.currentWord : '';

                return (
                    <div
                        key={rowIdx}
                        className={`${classes.miniRow} ${isShaking ? classes.miniShake : ''}`}
                    >
                        {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
                            const tileRevealed = revealedTiles.has(`${rowIdx}-${colIdx}`);
                            let tileClass = classes.miniTile;
                            const letter = showLetters && word ? word[colIdx] : '';

                            if (showLetters && letter) {
                                tileClass += ` ${classes.miniTileWithLetter}`;
                            }

                            if (isSubmitted && states) {
                                if (tileRevealed || !isRevealing) {
                                    tileClass += ` ${classes[states[colIdx]]}`;
                                }
                                if (isRevealing) {
                                    tileClass += ` ${classes.miniReveal}`;
                                }
                            } else if (isCurrentRow && colIdx < player.letterCount) {
                                tileClass += ` ${classes.miniTyping}`;
                            }

                            return (
                                <div
                                    key={colIdx}
                                    className={tileClass}
                                    style={isRevealing ? { animationDelay: `${colIdx * 300}ms` } : undefined}
                                >
                                    {letter && <span className={classes.miniLetter}>{letter}</span>}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

export default function SpectatorPanel({ players, viewerFinished }: { players: Map<string, SpectatorPlayer>; viewerFinished: boolean }) {
    if (players.size === 0) return null;

    const sorted = Array.from(players.values()).sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return 0;
    });

    return (
        <div className={classes.panel}>
            {sorted.map((player) => {
                const avatarUrl = getAvatarUrl(player.userId, player.avatar);
                const avatarClass = `${avatarUrl ? classes.avatar : classes.avatarPlaceholder} ${player.isOnline ? classes.avatarOnline : ''}`;

                return (
                    <div key={player.userId} className={classes.playerCard}>
                        <div className={classes.playerHeader}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className={avatarClass} />
                            ) : (
                                <div className={avatarClass} />
                            )}
                            <Text size="xs" c={player.isOnline ? '#a6da95' : 'dimmed'} fw={player.isOnline ? 700 : 400} truncate>{player.username}</Text>
                        </div>
                        <MiniSpectatorBoard player={player} showLetters={viewerFinished} />
                    </div>
                );
            })}
        </div>
    );
}
