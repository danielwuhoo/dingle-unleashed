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

function MiniSpectatorBoard({ player }: { player: SpectatorPlayer }) {
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

                return (
                    <div
                        key={rowIdx}
                        className={`${classes.miniRow} ${isShaking ? classes.miniShake : ''}`}
                    >
                        {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
                            const tileRevealed = revealedTiles.has(`${rowIdx}-${colIdx}`);
                            let tileClass = classes.miniTile;

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
                                />
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

export default function SpectatorPanel({ players }: { players: Map<string, SpectatorPlayer> }) {
    if (players.size === 0) return null;

    return (
        <div className={classes.panel}>
            {Array.from(players.values()).map((player) => {
                const avatarUrl = getAvatarUrl(player.userId, player.avatar);

                return (
                    <div key={player.userId} className={classes.playerCard}>
                        <div className={classes.playerHeader}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className={classes.avatar} />
                            ) : (
                                <div className={classes.avatarPlaceholder} />
                            )}
                            <Text size="xs" c="dimmed" truncate>{player.username}</Text>
                        </div>
                        <MiniSpectatorBoard player={player} />
                    </div>
                );
            })}
        </div>
    );
}
