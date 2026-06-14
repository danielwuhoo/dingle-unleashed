'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, Button, Group, Loader, Modal, Paper, Stack, Text, Title } from '@mantine/core';
import { useDiscordAuth } from '@/lib/hooks';
import { useMancalaLobby, useMockMancala, MancalaLobby, LobbyPlayer, LastMove, SOW_STEP_MS } from '@/lib/mancala-client';
import { MancalaState, STORE, Seat, legalMoves, pitsForSeat, sowPath } from '@/lib/mancala-engine';
import classes from './mancala.module.css';

function avatarUrl(userId: string, avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

export default function MancalaPage() {
    const { data: auth, isLoading } = useDiscordAuth();

    const realOptions = auth
        ? {
              instanceId: 'global',
              userId: auth.user.id,
              username: auth.user.global_name ?? auth.user.username,
              avatar: auth.user.avatar,
          }
        : null;

    const lobby = useMancalaLobby(realOptions);
    const practice = useMockMancala(auth ? { userId: auth.user.id } : null);
    const [practicing, setPracticing] = useState(false);
    const active = practicing ? practice : lobby;

    if (isLoading || !auth) {
        return (
            <Stack align="center" justify="center" h="100vh" gap="md">
                <Loader />
                <Text size="sm" c="dimmed">connecting...</Text>
            </Stack>
        );
    }

    const exitMatch = () => {
        active.leaveMatch();
        setPracticing(false);
    };

    return (
        <div className={classes.page}>
            {active.match ? (
                <MatchView lobby={active} myUserId={auth.user.id} onLeave={exitMatch} />
            ) : (
                <LobbyView
                    lobby={lobby}
                    onPractice={() => {
                        setPracticing(true);
                        practice.sendChallenge('');
                    }}
                />
            )}
        </div>
    );
}

function LobbyView({ lobby, onPractice }: { lobby: MancalaLobby; onPractice: () => void }) {
    const { players, incoming, outgoing, sendChallenge, respondToChallenge, dismissOutgoing } = lobby;

    return (
        <Stack align="center" gap="lg" className={classes.lobby}>
            <Group justify="space-between" w="100%" maw={420}>
                <Text component={Link} href="/" size="sm" c="dimmed" td="underline">← back</Text>
                <Text size="sm" c={lobby.connected ? 'green' : 'dimmed'}>
                    {lobby.connected ? 'online' : 'connecting...'}
                </Text>
            </Group>

            <Title order={2}>Mancala</Title>
            <Text size="sm" c="dimmed">Challenge someone to a game.</Text>

            <Stack gap="xs" w="100%" maw={420}>
                {players.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                        No one else is online. Ask a friend to open Mancala, or practice against the bot.
                    </Text>
                ) : (
                    players.map((p) => <PlayerRow key={p.userId} player={p} onChallenge={() => sendChallenge(p.userId)} />)
                )}
            </Stack>

            <Button variant="light" color="mauve" onClick={onPractice}>
                Practice vs Bot
            </Button>

            <Modal
                opened={!!incoming}
                onClose={() => respondToChallenge(false)}
                centered
                withCloseButton={false}
                size="xs"
                title="Challenge!"
            >
                {incoming && (
                    <Stack gap="md">
                        <Group gap="sm">
                            <Avatar src={avatarUrl(incoming.challenger.userId, incoming.challenger.avatar)} radius="xl" />
                            <Text fw={700}>{incoming.challenger.username}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">wants to play Mancala with you.</Text>
                        <Group grow>
                            <Button variant="default" onClick={() => respondToChallenge(false)}>Decline</Button>
                            <Button color="green" onClick={() => respondToChallenge(true)}>Accept</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={!!outgoing}
                onClose={dismissOutgoing}
                centered
                withCloseButton
                size="xs"
                title={outgoing?.status === 'declined' ? 'Declined' : 'Waiting...'}
            >
                {outgoing && (
                    <Text size="sm" c="dimmed">
                        {outgoing.status === 'declined'
                            ? 'Your challenge was declined.'
                            : 'Waiting for them to accept your challenge...'}
                    </Text>
                )}
            </Modal>
        </Stack>
    );
}

function PlayerRow({ player, onChallenge }: { player: LobbyPlayer; onChallenge: () => void }) {
    const busy = player.status === 'playing';
    return (
        <Paper withBorder p="sm" radius="md">
            <Group justify="space-between">
                <Group gap="sm">
                    <Avatar src={avatarUrl(player.userId, player.avatar)} radius="xl" size="md" />
                    <Text fw={600}>{player.username}</Text>
                </Group>
                <Button size="xs" color="mauve" disabled={busy} onClick={onChallenge}>
                    {busy ? 'in game' : 'challenge'}
                </Button>
            </Group>
        </Paper>
    );
}

function MatchView({ lobby, myUserId, onLeave }: { lobby: MancalaLobby; myUserId: string; onLeave: () => void }) {
    const { match, result, lastMove, sendMove, rematch } = lobby;
    if (!match) return null;

    const { state, seat, opponent } = match;
    const banner = getBanner(state, seat, result, myUserId);

    return (
        <Stack align="center" gap="md" className={classes.matchView}>
            <Group justify="space-between" w="100%" maw={560}>
                <Text component="span" size="sm" c="dimmed" style={{ cursor: 'pointer' }} onClick={onLeave}>
                    ← leave
                </Text>
                <Group gap="xs">
                    <Avatar src={avatarUrl(opponent.userId, opponent.avatar)} radius="xl" size="sm" />
                    <Text size="sm">vs {opponent.username}</Text>
                </Group>
            </Group>

            <Text fw={700} c={state.status === 'playing' && state.turn === seat ? 'green' : 'dimmed'}>
                {banner}
            </Text>

            <Board key={match.matchId} state={state} lastMove={lastMove} seat={seat} onPit={sendMove} />

            {state.status === 'over' && (
                <Group>
                    <Button color="mauve" onClick={rematch}>Rematch</Button>
                    <Button variant="default" onClick={onLeave}>Back to lobby</Button>
                </Group>
            )}
        </Stack>
    );
}

function getBanner(state: MancalaState, seat: Seat, result: MancalaLobby['result'], myUserId: string): string {
    if (result?.reason === 'forfeit') {
        return result.forfeitedBy === myUserId ? 'You forfeited' : 'Opponent left — you win!';
    }
    if (state.status === 'over') {
        if (state.winner === 'draw') return "It's a draw!";
        return state.winner === seat ? 'You win! 🎉' : 'You lose';
    }
    return state.turn === seat ? 'Your turn' : "Opponent's turn";
}

function Board({
    state,
    lastMove,
    seat,
    onPit,
}: {
    state: MancalaState;
    lastMove: LastMove | null;
    seat: Seat;
    onPit: (pit: number) => void;
}) {
    // `display` is the visually-shown board, which lags the authoritative state
    // during the sow animation. It settles to state.pits when the animation ends.
    const [display, setDisplay] = useState<number[]>(state.pits);
    const [animating, setAnimating] = useState(false);
    const displayRef = useRef<number[]>(state.pits);
    const animatedMoveRef = useRef<LastMove | null>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const setBoard = (pits: number[]) => {
        displayRef.current = pits;
        setDisplay(pits);
    };

    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    useEffect(() => clearTimers, []);

    useEffect(() => {
        if (lastMove && lastMove !== animatedMoveRef.current) {
            animatedMoveRef.current = lastMove;
            clearTimers();
            setAnimating(true);

            const from = displayRef.current.slice();
            const path = sowPath(from, lastMove.seat, lastMove.pit);
            const work = from.slice();
            work[lastMove.pit] = 0;
            setBoard(work.slice());

            path.forEach((idx, i) => {
                const t = setTimeout(() => {
                    work[idx] += 1;
                    setBoard(work.slice());
                    if (i === path.length - 1) {
                        const settle = setTimeout(() => {
                            setBoard(state.pits.slice()); // apply captures / end-game sweep
                            setAnimating(false);
                        }, SOW_STEP_MS);
                        timersRef.current.push(settle);
                    }
                }, (i + 1) * SOW_STEP_MS);
                timersRef.current.push(t);
            });

            if (path.length === 0) {
                setBoard(state.pits.slice());
                setAnimating(false);
            }
        } else if (!lastMove) {
            // Fresh match / no move yet — show the board as-is.
            animatedMoveRef.current = null;
            setBoard(state.pits.slice());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMove, state]);

    const oppSeat: Seat = seat === 0 ? 1 : 0;
    const myPits = pitsForSeat(seat); // bottom row, sowing order left→right
    const oppPits = [...pitsForSeat(oppSeat)].reverse(); // top row, mirrored
    const canMove = state.status === 'playing' && state.turn === seat && !animating;
    const legal = canMove ? legalMoves(state, seat) : [];

    return (
        <div className={classes.board}>
            <Store value={display[STORE[oppSeat]]} variant="opp" position="left" />

            <div className={classes.topRow}>
                {oppPits.map((pit) => (
                    <Pit key={pit} value={display[pit]} clickable={false} />
                ))}
            </div>

            <div className={classes.bottomRow}>
                {myPits.map((pit) => (
                    <Pit
                        key={pit}
                        value={display[pit]}
                        clickable={legal.includes(pit)}
                        onClick={() => onPit(pit)}
                    />
                ))}
            </div>

            <Store value={display[STORE[seat]]} variant="mine" position="right" />
        </div>
    );
}

function Stones({ count }: { count: number }) {
    return (
        <div className={classes.stones}>
            {Array.from({ length: count }).map((_, i) => (
                <span key={i} className={classes.stone} />
            ))}
        </div>
    );
}

function Pit({ value, clickable, onClick }: { value: number; clickable: boolean; onClick?: () => void }) {
    return (
        <button
            type="button"
            className={`${classes.pit} ${clickable ? classes.pitActive : ''}`}
            disabled={!clickable}
            onClick={onClick}
        >
            <Stones count={value} />
            <span className={classes.pitCount}>{value}</span>
        </button>
    );
}

function Store({ value, variant, position }: { value: number; variant: 'mine' | 'opp'; position: 'left' | 'right' }) {
    return (
        <div
            className={`${classes.store} ${variant === 'mine' ? classes.storeMine : ''} ${position === 'left' ? classes.storeLeft : classes.storeRight}`}
        >
            <span className={classes.storeCount}>{value}</span>
            <Stones count={value} />
        </div>
    );
}
