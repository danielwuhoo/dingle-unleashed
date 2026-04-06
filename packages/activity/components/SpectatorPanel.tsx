'use client';

import { Text } from '@mantine/core';
import { SpectatorPlayer } from '@/lib/socket-client';
import { LetterState } from '@/lib/wordle-utils';
import classes from './SpectatorPanel.module.css';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

function getAvatarUrl(userId: string, avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

function MiniSpectatorBoard({ player }: { player: SpectatorPlayer }) {
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
                            let tileClass = classes.miniTile;

                            if (isSubmitted && states) {
                                tileClass += ` ${classes[states[colIdx]]}`;
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
