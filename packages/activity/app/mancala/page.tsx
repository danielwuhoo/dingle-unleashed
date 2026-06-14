'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, Button, Group, Loader, Modal, Paper, Stack, Switch, Text, Title } from '@mantine/core';
import { useDiscordAuth } from '@/lib/hooks';
import { useMancalaLobby, useMockMancala, MancalaLobby, LobbyPlayer, LastMove, MatchSummary, canSwap, SOW_STEP_MS } from '@/lib/mancala-client';
import { MancalaState, RuleConfig, DEFAULT_RULES, STORE, Seat, legalMoves, pitsForSeat, sowSequence } from '@/lib/mancala-engine';
import { playTick, playScoop, playCapture, playExtraTurn, playWin, playLose, useMute } from '@/lib/mancala-sound';
import classes from './mancala.module.css';

// Catppuccin accent palette for the marbles / confetti.
const MARBLE_COLORS = ['#c6a0f6', '#8bd5ca', '#f5a97f', '#8aadf4', '#a6da95', '#eed49f', '#f5bde6', '#91d7e3'];

function avatarUrl(userId: string, avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=64`;
}

type Orientation = 'horizontal' | 'vertical';

// Per-client cosmetic board orientation, persisted to localStorage.
function useBoardOrientation(): { orientation: Orientation; toggle: () => void } {
    const [orientation, setOrientation] = useState<Orientation>('horizontal');
    useEffect(() => {
        if (typeof window !== 'undefined' && window.localStorage.getItem('mancala-orientation') === 'vertical') {
            setOrientation('vertical');
        }
    }, []);
    const toggle = useCallback(() => {
        setOrientation((prev) => {
            const next: Orientation = prev === 'horizontal' ? 'vertical' : 'horizontal';
            if (typeof window !== 'undefined') window.localStorage.setItem('mancala-orientation', next);
            return next;
        });
    }, []);
    return { orientation, toggle };
}

// Deterministic pseudo-random in [0,1) from a seed, so each stone keeps a stable
// scattered position/shape across re-renders (no jittering on every update).
function rand(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// Irregular, non-spherical "pebble" outlines.
const STONE_SHAPES = [
    '49% 51% 48% 52% / 53% 47% 53% 47%',
    '53% 47% 52% 48% / 47% 52% 48% 53%',
    '47% 53% 50% 50% / 52% 48% 52% 48%',
    '52% 48% 47% 53% / 48% 53% 47% 52%',
    '50% 50% 53% 47% / 51% 49% 51% 49%',
];

// Stone width as a % of its container — shrinks as the pit/store fills so a big
// pile stays inside the box.
function stoneWidthPct(count: number, store: boolean): number {
    if (store) {
        if (count <= 6) return 24;
        if (count <= 14) return 19;
        if (count <= 26) return 15;
        return 12;
    }
    if (count <= 4) return 38;
    if (count <= 8) return 31;
    if (count <= 12) return 25;
    if (count <= 18) return 21;
    return 17;
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
            ) : lobby.spectating ? (
                <SpectateView lobby={lobby} />
            ) : (
                <LobbyView
                    lobby={lobby}
                    onPractice={(config) => {
                        setPracticing(true);
                        practice.sendChallenge('', config);
                    }}
                />
            )}
        </div>
    );
}

type Configuring = { kind: 'challenge'; userId: string } | { kind: 'practice' } | null;

function LobbyView({ lobby, onPractice }: { lobby: MancalaLobby; onPractice: (config: RuleConfig) => void }) {
    const { players, liveMatches, incoming, outgoing, sendChallenge, respondToChallenge, dismissOutgoing, spectate } = lobby;
    const [configuring, setConfiguring] = useState<Configuring>(null);

    const confirmRules = (config: RuleConfig) => {
        if (configuring?.kind === 'challenge') sendChallenge(configuring.userId, config);
        else if (configuring?.kind === 'practice') onPractice(config);
        setConfiguring(null);
    };

    return (
        <Stack align="center" gap="lg" className={classes.lobby}>
            <Group justify="space-between" w="100%" maw={420}>
                <Text component={Link} href="/" size="sm" c="dimmed" td="underline">← back</Text>
                <Text size="sm" c={lobby.connected ? 'green' : 'dimmed'}>
                    {lobby.connected ? 'online' : 'connecting...'}
                </Text>
            </Group>

            <Title order={2} className={classes.lobbyTitle}>Mancala</Title>
            <Text size="sm" c="dimmed">Challenge someone, or watch a live game.</Text>

            <Stack gap="xs" w="100%" maw={420}>
                {players.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                        No one else is online. Ask a friend to open Mancala, or practice against the bot.
                    </Text>
                ) : (
                    players.map((p) => (
                        <PlayerRow key={p.userId} player={p} onChallenge={() => setConfiguring({ kind: 'challenge', userId: p.userId })} />
                    ))
                )}
            </Stack>

            {liveMatches.length > 0 && (
                <Stack gap="xs" w="100%" maw={420}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">👀 Live games</Text>
                    {liveMatches.map((m) => (
                        <LiveMatchRow key={m.matchId} match={m} onWatch={() => spectate(m.matchId)} />
                    ))}
                </Stack>
            )}

            <Button variant="light" color="mauve" radius="xl" onClick={() => setConfiguring({ kind: 'practice' })}>
                🤖 Practice vs Bot
            </Button>

            <RulesModal
                key={configuring ? (configuring.kind === 'challenge' ? configuring.userId : 'practice') : 'none'}
                opened={!!configuring}
                onClose={() => setConfiguring(null)}
                onConfirm={confirmRules}
                confirmLabel={configuring?.kind === 'practice' ? 'Start game' : 'Send challenge'}
            />

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
                        <RuleChips config={incoming.config} />
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

const PRESETS: { key: string; label: string; emoji: string; config: RuleConfig }[] = [
    { key: 'classic', label: 'Classic', emoji: '🪨', config: { multiLap: false, pieRule: false, randomStart: false } },
    { key: 'relay', label: 'Relay', emoji: '🔁', config: { multiLap: true, pieRule: false, randomStart: false } },
    { key: 'balanced', label: 'Balanced', emoji: '⚖️', config: { multiLap: false, pieRule: true, randomStart: false } },
    { key: 'scramble', label: 'Scramble', emoji: '🎲', config: { multiLap: false, pieRule: false, randomStart: true } },
    { key: 'chaos', label: 'Chaos', emoji: '🌪️', config: { multiLap: true, pieRule: true, randomStart: true } },
];

function sameConfig(a: RuleConfig, b: RuleConfig): boolean {
    return a.multiLap === b.multiLap && a.pieRule === b.pieRule && a.randomStart === b.randomStart;
}

function ruleLabels(c: RuleConfig): string[] {
    const out = [c.multiLap ? 'Relay' : 'Single-lap'];
    if (c.pieRule) out.push('Pie rule');
    if (c.randomStart) out.push('Random start');
    return out;
}

function RuleChips({ config }: { config: RuleConfig }) {
    return (
        <Group gap={5} justify="center">
            {ruleLabels(config).map((l) => (
                <span key={l} className={classes.ruleChip}>{l}</span>
            ))}
        </Group>
    );
}

function RulesModal({
    opened,
    onClose,
    onConfirm,
    confirmLabel,
}: {
    opened: boolean;
    onClose: () => void;
    onConfirm: (config: RuleConfig) => void;
    confirmLabel: string;
}) {
    const [cfg, setCfg] = useState<RuleConfig>(DEFAULT_RULES);

    return (
        <Modal opened={opened} onClose={onClose} centered size="sm" title="Game rules">
            <Stack gap="md">
                <Group gap="xs">
                    {PRESETS.map((p) => (
                        <Button
                            key={p.key}
                            size="xs"
                            radius="xl"
                            color="mauve"
                            variant={sameConfig(cfg, p.config) ? 'filled' : 'default'}
                            onClick={() => setCfg(p.config)}
                        >
                            {p.emoji} {p.label}
                        </Button>
                    ))}
                </Group>

                <Stack gap="xs">
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">Advanced</Text>
                    <Switch
                        label="Multi-lap (relay sowing)"
                        checked={cfg.multiLap}
                        onChange={(e) => setCfg((c) => ({ ...c, multiLap: e.currentTarget.checked }))}
                    />
                    <Switch
                        label="Pie rule (swap after first move)"
                        checked={cfg.pieRule}
                        onChange={(e) => setCfg((c) => ({ ...c, pieRule: e.currentTarget.checked }))}
                    />
                    <Switch
                        label="Random start (mirrored, same total)"
                        checked={cfg.randomStart}
                        onChange={(e) => setCfg((c) => ({ ...c, randomStart: e.currentTarget.checked }))}
                    />
                </Stack>

                <Button color="mauve" radius="xl" onClick={() => onConfirm(cfg)}>{confirmLabel}</Button>
            </Stack>
        </Modal>
    );
}

function PlayerRow({ player, onChallenge }: { player: LobbyPlayer; onChallenge: () => void }) {
    const busy = player.status === 'playing';
    return (
        <Paper withBorder p="sm" radius="md" className={classes.playerRow}>
            <Group justify="space-between">
                <Group gap="sm">
                    <Avatar src={avatarUrl(player.userId, player.avatar)} radius="xl" size="md" />
                    <Text fw={600}>{player.username}</Text>
                </Group>
                <Button size="xs" color="mauve" radius="xl" disabled={busy} onClick={onChallenge}>
                    {busy ? 'in game' : 'challenge'}
                </Button>
            </Group>
        </Paper>
    );
}

function LiveMatchRow({ match, onWatch }: { match: MatchSummary; onWatch: () => void }) {
    const [a, b] = match.players;
    return (
        <Paper withBorder p="sm" radius="md" className={classes.playerRow}>
            <Group justify="space-between">
                <Group gap={6}>
                    <Avatar src={avatarUrl(a.userId, a.avatar)} radius="xl" size="sm" />
                    <Text size="sm" fw={600}>{a.username}</Text>
                    <Text size="xs" c="dimmed">vs</Text>
                    <Avatar src={avatarUrl(b.userId, b.avatar)} radius="xl" size="sm" />
                    <Text size="sm" fw={600}>{b.username}</Text>
                </Group>
                <Button size="xs" variant="light" color="teal" radius="xl" onClick={onWatch}>
                    watch
                </Button>
            </Group>
        </Paper>
    );
}

function SpectateView({ lobby }: { lobby: MancalaLobby }) {
    const { spectating, stopSpectating } = lobby;
    const { orientation, toggle: toggleOrient } = useBoardOrientation();
    if (!spectating) return null;

    const { players, state, ended } = spectating;
    const [p0, p1] = players;
    const isOver = state.status === 'over' || !!ended;

    let status: string;
    if (ended?.reason === 'forfeit') {
        const winner = ended.forfeitedBy === p0.userId ? p1 : p0;
        status = `${winner.username} wins (opponent left)`;
    } else if (isOver) {
        if (state.winner === 'draw') status = "It's a draw! 🤝";
        else status = `${state.winner === 0 ? p0.username : p1.username} wins! 🎉`;
    } else {
        status = `${state.turn === 0 ? p0.username : p1.username}'s turn`;
    }

    return (
        <Stack align="center" gap="md" className={classes.matchView}>
            <Group justify="space-between" w="100%" maw={560}>
                <Text component="span" size="sm" c="dimmed" className={classes.leaveLink} onClick={stopSpectating}>
                    ← stop watching
                </Text>
                <Group gap="sm">
                    <Text size="sm" c="teal">👀 spectating</Text>
                    <Text
                        component="span"
                        className={classes.muteBtn}
                        onClick={toggleOrient}
                        title={orientation === 'horizontal' ? 'Vertical board' : 'Horizontal board'}
                    >
                        {orientation === 'horizontal' ? '↕' : '↔'}
                    </Text>
                </Group>
            </Group>

            <Group gap="xs" justify="center">
                <PlayerChip player={p1} active={!isOver && state.turn === 1} />
                <Text size="sm" c="dimmed">vs</Text>
                <PlayerChip player={p0} active={!isOver && state.turn === 0} />
            </Group>

            <RuleChips config={spectating.config} />

            {isOver ? (
                <div className={`${classes.banner} ${classes.banner_draw}`}>{status}</div>
            ) : (
                <Text fw={700} className={classes.turnText} c="dimmed">{status}</Text>
            )}

            <Board key={spectating.matchId} state={state} lastMove={lobby.lastMove} seat={0} config={spectating.config} orientation={orientation} interactive={false} onPit={() => {}} />

            {isOver && (
                <Button variant="default" radius="xl" onClick={stopSpectating}>Back to lobby</Button>
            )}
        </Stack>
    );
}

function PlayerChip({ player, active }: { player: { userId: string; username: string; avatar?: string | null }; active: boolean }) {
    return (
        <Group gap={6} className={`${classes.playerChip} ${active ? classes.playerChipActive : ''}`}>
            <Avatar src={avatarUrl(player.userId, player.avatar)} radius="xl" size="sm" />
            <Text size="sm" fw={600}>{player.username}</Text>
        </Group>
    );
}

function MatchView({ lobby, myUserId, onLeave }: { lobby: MancalaLobby; myUserId: string; onLeave: () => void }) {
    const { match, result, lastMove, sendMove, swap, rematch } = lobby;
    const { muted, toggle } = useMute();
    const { orientation, toggle: toggleOrient } = useBoardOrientation();
    if (!match) return null;

    const { state, seat, opponent } = match;
    const oppSeat: Seat = seat === 0 ? 1 : 0;
    const isOver = state.status === 'over';
    const myTurn = !isOver && state.turn === seat;
    const outcome = getOutcome(state, seat, result, myUserId);
    const swapAvailable = canSwap(match);

    return (
        <Stack align="center" gap="md" className={classes.matchView}>
            {isOver && outcome === 'win' && <Confetti />}

            <Group justify="space-between" w="100%" maw={560}>
                <Text component="span" size="sm" c="dimmed" className={classes.leaveLink} onClick={onLeave}>
                    ← leave
                </Text>
                <Group gap="sm">
                    <Group gap="xs">
                        <Avatar src={avatarUrl(opponent.userId, opponent.avatar)} radius="xl" size="sm" />
                        <Text size="sm">vs {opponent.username}</Text>
                    </Group>
                    <Text
                        component="span"
                        className={classes.muteBtn}
                        onClick={toggleOrient}
                        title={orientation === 'horizontal' ? 'Vertical board' : 'Horizontal board'}
                    >
                        {orientation === 'horizontal' ? '↕' : '↔'}
                    </Text>
                    <Text component="span" className={classes.muteBtn} onClick={toggle} title={muted ? 'Unmute' : 'Mute'}>
                        {muted ? '🔇' : '🔊'}
                    </Text>
                </Group>
            </Group>

            {isOver ? (
                <Stack align="center" gap={6}>
                    <div className={`${classes.banner} ${classes[`banner_${outcome}`]}`}>{bannerText(outcome)}</div>
                    <div className={classes.scoreLine}>
                        <CountUp value={state.pits[STORE[seat]]} /> <span className={classes.scoreDash}>–</span>{' '}
                        <CountUp value={state.pits[STORE[oppSeat]]} />
                    </div>
                </Stack>
            ) : (
                <Stack align="center" gap={6}>
                    <Text fw={700} className={classes.turnText} c={myTurn ? 'green' : 'dimmed'}>
                        {myTurn ? '✨ Your turn' : `${opponent.username}'s turn`}
                    </Text>
                    <RuleChips config={match.config} />
                </Stack>
            )}

            {swapAvailable && (
                <Button size="xs" color="teal" radius="xl" variant="light" onClick={swap}>
                    ⇄ Swap sides (pie rule)
                </Button>
            )}

            <Board key={match.matchId} state={state} lastMove={lastMove} seat={seat} config={match.config} orientation={orientation} onPit={sendMove} />

            {isOver && (
                <Group>
                    <Button color="mauve" radius="xl" onClick={rematch}>Rematch</Button>
                    <Button variant="default" radius="xl" onClick={onLeave}>Back to lobby</Button>
                </Group>
            )}
        </Stack>
    );
}

type Outcome = 'win' | 'lose' | 'draw';

function getOutcome(state: MancalaState, seat: Seat, result: MancalaLobby['result'], myUserId: string): Outcome {
    if (result?.reason === 'forfeit') return result.forfeitedBy === myUserId ? 'lose' : 'win';
    if (state.winner === 'draw') return 'draw';
    return state.winner === seat ? 'win' : 'lose';
}

function bannerText(outcome: Outcome): string {
    if (outcome === 'win') return 'You win! 🎉';
    if (outcome === 'draw') return "It's a draw! 🤝";
    return 'You lose 😔';
}

interface FlyingStone {
    id: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
    delay: number;
}

interface HopStone {
    id: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
}

// Brief hold of the scooped handful before the first stone is dropped.
const SCOOP_PAUSE_MS = 160;

function Board({
    state,
    lastMove,
    seat,
    config,
    onPit,
    interactive = true,
    orientation = 'horizontal',
}: {
    state: MancalaState;
    lastMove: LastMove | null;
    seat: Seat;
    config: RuleConfig;
    onPit: (pit: number) => void;
    interactive?: boolean;
    orientation?: Orientation;
}) {
    // `display` is the visually-shown board, which lags the authoritative state
    // during the sow animation, then settles to state.pits when it ends.
    const [display, setDisplay] = useState<number[]>(state.pits);
    const [animating, setAnimating] = useState(false);
    const [flashPits, setFlashPits] = useState<number[]>([]);
    const [celebrateStore, setCelebrateStore] = useState<number | null>(null);
    const [jigglePit, setJigglePit] = useState<number | null>(null);
    const [extraTurnBy, setExtraTurnBy] = useState<Seat | null>(null);
    const [flying, setFlying] = useState<FlyingStone[]>([]);
    const [hops, setHops] = useState<HopStone[]>([]);

    const displayRef = useRef<number[]>(state.pits);
    const animatedMoveRef = useRef<LastMove | null>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const pitEls = useRef<Record<number, HTMLElement | null>>({});

    const setBoard = (pits: number[]) => {
        displayRef.current = pits;
        setDisplay(pits);
    };

    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    useEffect(() => clearTimers, []);

    const centerOf = (idx: number) => {
        const board = boardRef.current;
        const el = pitEls.current[idx];
        if (!board || !el) return null;
        const b = board.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
    };

    // A single stone hopping from one well to the next as the handful is dropped.
    const hopStone = (fromIdx: number, toIdx: number, i: number) => {
        const from = centerOf(fromIdx);
        const to = centerOf(toIdx);
        if (!from || !to) return;
        const id = `hop-${i}-${Date.now()}-${Math.random()}`;
        setHops((prev) => [
            ...prev,
            { id, x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y, color: MARBLE_COLORS[i % MARBLE_COLORS.length] },
        ]);
        const t = setTimeout(() => setHops((prev) => prev.filter((h) => h.id !== id)), SOW_STEP_MS + 140);
        timersRef.current.push(t);
    };

    // Stones flying from a pit into a store (capture or end-game sweep).
    const flyToStore = (fromIdx: number, storeIdx: number, count: number) => {
        const from = centerOf(fromIdx);
        const to = centerOf(storeIdx);
        if (!from || !to) return;
        const n = Math.min(count, 6);
        const stones: FlyingStone[] = Array.from({ length: n }).map((_, k) => ({
            id: `${storeIdx}-${fromIdx}-${k}-${Date.now()}-${Math.random()}`,
            x: from.x,
            y: from.y,
            dx: to.x - from.x,
            dy: to.y - from.y,
            color: MARBLE_COLORS[(fromIdx + k) % MARBLE_COLORS.length],
            delay: k * 45,
        }));
        setFlying((prev) => [...prev, ...stones]);
        const ids = new Set(stones.map((st) => st.id));
        const t = setTimeout(() => setFlying((prev) => prev.filter((st) => !ids.has(st.id))), 750 + n * 45);
        timersRef.current.push(t);
    };

    useEffect(() => {
        if (lastMove && lastMove !== animatedMoveRef.current) {
            const move = lastMove;
            animatedMoveRef.current = move;
            clearTimers();
            setAnimating(true);

            const from = displayRef.current.slice();
            const laps = sowSequence(from, move.seat, move.pit, config);
            const work = from.slice();

            if (laps.length === 0) {
                setBoard(state.pits.slice());
                setAnimating(false);
            } else {
                // Walk the laps on a shared timeline: scoop a pit, hop a stone into each
                // well, relay into the next lap, and finally settle to the true state.
                let cursor = 0;
                let hopSeq = 0;
                laps.forEach((lap) => {
                    const scoopAt = cursor;
                    const scoopT = setTimeout(() => {
                        work[lap.from] = 0;
                        setBoard(work.slice());
                        playScoop();
                    }, scoopAt);
                    timersRef.current.push(scoopT);
                    cursor += SCOOP_PAUSE_MS;

                    lap.path.forEach((idx, i) => {
                        const prevIdx = i === 0 ? lap.from : lap.path[i - 1];
                        const startAt = cursor + i * SOW_STEP_MS;
                        const seq = hopSeq;
                        hopSeq += 1;
                        const hopT = setTimeout(() => hopStone(prevIdx, idx, seq), startAt);
                        const landT = setTimeout(() => {
                            work[idx] += 1;
                            setBoard(work.slice());
                            playTick(i, idx === STORE[0] || idx === STORE[1]);
                            setJigglePit(idx);
                            const jc = setTimeout(() => setJigglePit((j) => (j === idx ? null : j)), 220);
                            timersRef.current.push(jc);
                        }, startAt + SOW_STEP_MS);
                        timersRef.current.push(hopT, landT);
                    });
                    cursor += lap.path.length * SOW_STEP_MS + 80;
                });

                const lastLap = laps[laps.length - 1];
                const finalLanding = lastLap.path[lastLap.path.length - 1];

                const settle = setTimeout(() => {
                    const changed: number[] = [];
                    for (let p = 0; p < 14; p += 1) {
                        if (p === STORE[0] || p === STORE[1]) continue;
                        if (state.pits[p] < work[p]) changed.push(p);
                    }

                    if (changed.length > 0) {
                        if (state.status === 'over') {
                            // End-game sweep: each side's leftovers cascade into its own store.
                            changed.forEach((p) => flyToStore(p, STORE[p <= 5 ? 0 : 1], work[p] - state.pits[p]));
                        } else {
                            // Capture into the mover's store.
                            const storeIdx = STORE[move.seat];
                            setFlashPits(changed);
                            setCelebrateStore(storeIdx);
                            playCapture();
                            changed.forEach((p) => flyToStore(p, storeIdx, work[p] - state.pits[p]));
                            const clear = setTimeout(() => {
                                setFlashPits([]);
                                setCelebrateStore(null);
                            }, 850);
                            timersRef.current.push(clear);
                        }
                    }

                    // Extra turn: the last stone dropped into the mover's own store.
                    if (state.status === 'playing' && finalLanding === STORE[move.seat]) {
                        setExtraTurnBy(move.seat);
                        setCelebrateStore(STORE[move.seat]);
                        if (move.seat === seat || !interactive) playExtraTurn();
                        const clr = setTimeout(() => {
                            setExtraTurnBy(null);
                            setCelebrateStore(null);
                        }, 1300);
                        timersRef.current.push(clr);
                    }

                    setBoard(state.pits.slice());
                    setAnimating(false);
                }, cursor + 60);
                timersRef.current.push(settle);
            }
        } else if (!lastMove) {
            animatedMoveRef.current = null;
            setBoard(state.pits.slice());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMove, state]);

    // Win/lose chime, once, when the game ends. Spectators get a neutral fanfare.
    useEffect(() => {
        if (state.status === 'over') {
            if (!interactive) {
                if (state.winner !== 'draw') playWin();
            } else if (state.winner === seat) {
                playWin();
            } else if (state.winner !== 'draw') {
                playLose();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status]);

    const oppSeat: Seat = seat === 0 ? 1 : 0;
    const myPits = pitsForSeat(seat); // bottom row, sowing order left→right
    const oppPits = [...pitsForSeat(oppSeat)].reverse(); // top row, mirrored
    const canMove = interactive && state.status === 'playing' && state.turn === seat && !animating;
    const legal = canMove ? legalMoves(state, seat) : [];

    const setPitEl = (idx: number) => (el: HTMLElement | null) => {
        pitEls.current[idx] = el;
    };

    const vertical = orientation === 'vertical';

    return (
        <div className={`${classes.board} ${vertical ? classes.vertical : ''}`} ref={boardRef}>
            <Store
                value={display[STORE[oppSeat]]}
                seed={STORE[oppSeat]}
                variant="opp"
                position="left"
                vertical={vertical}
                celebrate={celebrateStore === STORE[oppSeat]}
                elRef={setPitEl(STORE[oppSeat])}
            />

            <div className={classes.topRow}>
                {oppPits.map((pit) => (
                    <Pit
                        key={pit}
                        value={display[pit]}
                        seed={pit}
                        clickable={false}
                        flash={flashPits.includes(pit)}
                        jiggle={jigglePit === pit}
                        elRef={setPitEl(pit)}
                    />
                ))}
            </div>

            <div className={classes.bottomRow}>
                {myPits.map((pit) => (
                    <Pit
                        key={pit}
                        value={display[pit]}
                        seed={pit}
                        clickable={legal.includes(pit)}
                        flash={flashPits.includes(pit)}
                        jiggle={jigglePit === pit}
                        elRef={setPitEl(pit)}
                        onClick={() => onPit(pit)}
                    />
                ))}
            </div>

            <Store
                value={display[STORE[seat]]}
                seed={STORE[seat]}
                variant="mine"
                position="right"
                vertical={vertical}
                celebrate={celebrateStore === STORE[seat]}
                elRef={setPitEl(STORE[seat])}
            />

            <div className={classes.overlay}>
                {hops.map((h) => (
                    <span
                        key={h.id}
                        className={classes.hopStone}
                        style={
                            {
                                left: h.x,
                                top: h.y,
                                animationDuration: `${SOW_STEP_MS}ms`,
                                '--dx': `${h.dx}px`,
                                '--dy': `${h.dy}px`,
                                '--c': h.color,
                            } as React.CSSProperties
                        }
                    />
                ))}
                {flying.map((s) => (
                    <span
                        key={s.id}
                        className={classes.flyingStone}
                        style={
                            {
                                left: s.x,
                                top: s.y,
                                animationDelay: `${s.delay}ms`,
                                '--dx': `${s.dx}px`,
                                '--dy': `${s.dy}px`,
                                '--c': s.color,
                            } as React.CSSProperties
                        }
                    />
                ))}
            </div>

            {extraTurnBy !== null && (
                <div className={classes.extraTurn}>{extraTurnBy === seat ? 'Go again! ↻' : 'Extra turn ↻'}</div>
            )}
        </div>
    );
}

function StoneField({ count, store = false, seed = 0, wide = false }: { count: number; store?: boolean; seed?: number; wide?: boolean }) {
    const cap = store ? 40 : 22;
    const visible = Math.min(count, cap);
    // A wide (vertical-orientation) store is short, so keep its stones smaller.
    const size = Math.min(stoneWidthPct(count, store), wide ? 13 : 100);
    const base = seed * 100 + 1; // unique scatter per well, stable across renders

    return (
        <div className={classes.stoneField}>
            {Array.from({ length: visible }).map((_, i) => {
                const r1 = rand(base + i + 1);
                const r2 = rand(base + i * 1.7 + 7.3);
                const r3 = rand(base + i * 2.3 + 13.1);

                let x: number;
                let y: number;
                if (store) {
                    // Elongated along the store's long axis (vertical normally, horizontal when wide).
                    const tight = Math.max(0, 50 - size / 2 - 5);
                    x = (r1 * 2 - 1) * (wide ? 45 : tight);
                    y = (r2 * 2 - 1) * (wide ? tight : 45);
                } else {
                    // Uniform scatter within the circular pit.
                    const radius = Math.sqrt(r2) * (50 - size / 2 - 4);
                    const angle = r1 * Math.PI * 2;
                    x = Math.cos(angle) * radius;
                    y = Math.sin(angle) * radius;
                }

                return (
                    <span
                        key={i}
                        className={classes.stonePoint}
                        style={
                            {
                                left: `${50 + x}%`,
                                top: `${50 + y}%`,
                                width: `${size}%`,
                                aspectRatio: `${(0.86 + r3 * 0.28).toFixed(2)}`,
                                transform: `translate(-50%, -50%) rotate(${(r3 * 90 - 45).toFixed(1)}deg)`,
                            } as React.CSSProperties
                        }
                    >
                        <span
                            className={classes.stone}
                            style={
                                {
                                    borderRadius: STONE_SHAPES[i % STONE_SHAPES.length],
                                    '--c': MARBLE_COLORS[i % MARBLE_COLORS.length],
                                } as React.CSSProperties
                            }
                        />
                    </span>
                );
            })}
        </div>
    );
}

function Pit({
    value,
    seed,
    clickable,
    flash,
    jiggle,
    onClick,
    elRef,
}: {
    value: number;
    seed: number;
    clickable: boolean;
    flash?: boolean;
    jiggle?: boolean;
    onClick?: () => void;
    elRef?: (el: HTMLButtonElement | null) => void;
}) {
    return (
        <button
            ref={elRef}
            type="button"
            className={`${classes.pit} ${clickable ? classes.pitActive : ''} ${flash ? classes.pitFlash : ''} ${jiggle ? classes.pitJiggle : ''}`}
            disabled={!clickable}
            onClick={onClick}
        >
            <StoneField count={value} seed={seed} />
            {value > 0 && <span className={classes.pitCount}>{value}</span>}
        </button>
    );
}

function Store({
    value,
    seed,
    variant,
    position,
    vertical,
    celebrate,
    elRef,
}: {
    value: number;
    seed: number;
    variant: 'mine' | 'opp';
    position: 'left' | 'right';
    vertical?: boolean;
    celebrate?: boolean;
    elRef?: (el: HTMLDivElement | null) => void;
}) {
    return (
        <div
            ref={elRef}
            className={`${classes.store} ${variant === 'mine' ? classes.storeMine : ''} ${
                position === 'left' ? classes.storeLeft : classes.storeRight
            } ${celebrate ? classes.storeCelebrate : ''}`}
        >
            <StoneField count={value} store seed={seed} wide={vertical} />
            <span className={classes.storeCount}>{value}</span>
        </div>
    );
}

function CountUp({ value }: { value: number }) {
    const [n, setN] = useState(0);
    useEffect(() => {
        let raf = 0;
        let startTs = 0;
        const duration = 900;
        const tick = (ts: number) => {
            if (!startTs) startTs = ts;
            const p = Math.min(1, (ts - startTs) / duration);
            setN(Math.round(p * value));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value]);
    return <>{n}</>;
}

function Confetti() {
    const pieces = useMemo(
        () =>
            Array.from({ length: 90 }).map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                color: MARBLE_COLORS[i % MARBLE_COLORS.length],
                delay: Math.random() * 0.6,
                duration: 2.4 + Math.random() * 1.8,
                rot: Math.random() * 720 - 360,
                size: 6 + Math.random() * 7,
            })),
        [],
    );
    return (
        <div className={classes.confetti}>
            {pieces.map((p) => (
                <span
                    key={p.id}
                    className={classes.confettiPiece}
                    style={
                        {
                            left: `${p.left}%`,
                            background: p.color,
                            width: p.size,
                            height: p.size,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            '--rot': `${p.rot}deg`,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
}
