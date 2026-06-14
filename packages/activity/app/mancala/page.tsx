'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Avatar, Button, Group, Loader, Modal, Paper, Stack, Text, Title } from '@mantine/core';
import { useDiscordAuth, getDiscordInstanceId } from '@/lib/hooks';
import { isRunningInDiscord } from '@/lib/discord';
import { useMancalaLobby, useMockMancala, MancalaLobby, LobbyPlayer } from '@/lib/mancala-client';
import { MancalaState, Seat, legalMoves, pitsForSeat, scoreFor } from '@/lib/mancala-engine';
import classes from './mancala.module.css';

function avatarUrl(userId: string, avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

export default function MancalaPage() {
    const { data: auth, isLoading } = useDiscordAuth();
    const inDiscord = isRunningInDiscord();

    const instanceId = useMemo(() => (inDiscord ? getDiscordInstanceId() : 'dev-lobby'), [inDiscord]);

    const realOptions = auth
        ? {
              instanceId,
              userId: auth.user.id,
              username: auth.user.global_name ?? auth.user.username,
              avatar: auth.user.avatar,
          }
        : null;

    const realLobby = useMancalaLobby(inDiscord ? realOptions : null);
    const mockLobby = useMockMancala(auth ? { userId: auth.user.id } : null);
    const lobby = inDiscord ? realLobby : mockLobby;

    if (isLoading || !auth) {
        return (
            <Stack align="center" justify="center" h="100vh" gap="md">
                <Loader />
                <Text size="sm" c="dimmed">connecting...</Text>
            </Stack>
        );
    }

    return (
        <div className={classes.page}>
            {lobby.match ? (
                <MatchView lobby={lobby} myUserId={auth.user.id} />
            ) : (
                <LobbyView lobby={lobby} />
            )}
        </div>
    );
}

function LobbyView({ lobby }: { lobby: MancalaLobby }) {
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
                        No one else is here yet. Open Mancala on another device to play.
                    </Text>
                ) : (
                    players.map((p) => <PlayerRow key={p.userId} player={p} onChallenge={() => sendChallenge(p.userId)} />)
                )}
            </Stack>

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

function MatchView({ lobby, myUserId }: { lobby: MancalaLobby; myUserId: string }) {
    const { match, result, sendMove, rematch, leaveMatch } = lobby;
    if (!match) return null;

    const { state, seat, opponent } = match;
    const myTurn = state.status === 'playing' && state.turn === seat;

    const banner = getBanner(state, seat, result, myUserId);

    return (
        <Stack align="center" gap="md" className={classes.matchView}>
            <Group justify="space-between" w="100%" maw={560}>
                <Text component="span" size="sm" c="dimmed" style={{ cursor: 'pointer' }} onClick={leaveMatch}>
                    ← leave
                </Text>
                <Group gap="xs">
                    <Avatar src={avatarUrl(opponent.userId, opponent.avatar)} radius="xl" size="sm" />
                    <Text size="sm">vs {opponent.username}</Text>
                </Group>
            </Group>

            <Text fw={700} c={myTurn ? 'green' : 'dimmed'}>
                {banner}
            </Text>

            <Board state={state} seat={seat} canMove={myTurn} onPit={sendMove} />

            {state.status === 'over' && (
                <Group>
                    <Button color="mauve" onClick={rematch}>Rematch</Button>
                    <Button variant="default" onClick={leaveMatch}>Back to lobby</Button>
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
    seat,
    canMove,
    onPit,
}: {
    state: MancalaState;
    seat: Seat;
    canMove: boolean;
    onPit: (pit: number) => void;
}) {
    const oppSeat: Seat = seat === 0 ? 1 : 0;
    const myPits = pitsForSeat(seat); // bottom row, sowing order left→right
    const oppPits = [...pitsForSeat(oppSeat)].reverse(); // top row, mirrored
    const legal = canMove ? legalMoves(state, seat) : [];

    return (
        <div className={classes.board}>
            <Store value={scoreFor(state, oppSeat)} variant="opp" position="left" />

            <div className={classes.topRow}>
                {oppPits.map((pit) => (
                    <Pit key={pit} value={state.pits[pit]} clickable={false} />
                ))}
            </div>

            <div className={classes.bottomRow}>
                {myPits.map((pit) => (
                    <Pit
                        key={pit}
                        value={state.pits[pit]}
                        clickable={legal.includes(pit)}
                        onClick={() => onPit(pit)}
                    />
                ))}
            </div>

            <Store value={scoreFor(state, seat)} variant="mine" position="right" />
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
            <span className={classes.pitCount}>{value}</span>
        </button>
    );
}

function Store({ value, variant, position }: { value: number; variant: 'mine' | 'opp'; position: 'left' | 'right' }) {
    return (
        <div className={`${classes.store} ${variant === 'mine' ? classes.storeMine : ''} ${position === 'left' ? classes.storeLeft : classes.storeRight}`}>
            <span className={classes.storeCount}>{value}</span>
        </div>
    );
}
