'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MancalaState, Seat, applyMove, initialState, legalMoves, sowPath } from './mancala-engine';

// Milliseconds between each stone landing during the sow animation. Shared so
// the practice bot can wait for the current animation to finish before moving.
export const SOW_STEP_MS = 150;

export interface LobbyPlayer {
    userId: string;
    username: string;
    avatar?: string | null;
    status: 'idle' | 'playing';
}

export interface Opponent {
    userId: string;
    username: string;
    avatar?: string | null;
}

export interface MatchInfo {
    matchId: string;
    seat: Seat;
    opponent: Opponent;
    state: MancalaState;
}

export interface IncomingChallenge {
    challenger: Opponent;
}

export interface OutgoingChallenge {
    targetUserId: string;
    status: 'pending' | 'declined';
}

export interface MatchResult {
    reason: 'finished' | 'forfeit';
    forfeitedBy: string | null;
}

export interface LastMove {
    seat: Seat;
    pit: number;
}

export interface MancalaLobby {
    connected: boolean;
    players: LobbyPlayer[];
    incoming: IncomingChallenge | null;
    outgoing: OutgoingChallenge | null;
    match: MatchInfo | null;
    result: MatchResult | null;
    lastMove: LastMove | null;
    sendChallenge: (targetUserId: string) => void;
    respondToChallenge: (accept: boolean) => void;
    sendMove: (pit: number) => void;
    rematch: () => void;
    leaveMatch: () => void;
    dismissOutgoing: () => void;
}

interface UseMancalaOptions {
    instanceId: string;
    userId: string;
    username: string;
    avatar?: string | null;
}

export function useMancalaLobby(options: UseMancalaOptions | null): MancalaLobby {
    const [connected, setConnected] = useState(false);
    const [players, setPlayers] = useState<LobbyPlayer[]>([]);
    const [incoming, setIncoming] = useState<IncomingChallenge | null>(null);
    const [outgoing, setOutgoing] = useState<OutgoingChallenge | null>(null);
    const [match, setMatch] = useState<MatchInfo | null>(null);
    const [result, setResult] = useState<MatchResult | null>(null);
    const [lastMove, setLastMove] = useState<LastMove | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!options) return undefined;

        const socket = io({ path: '/api/socketio', transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('mancala_join', {
                instanceId: options.instanceId,
                userId: options.userId,
                username: options.username,
                avatar: options.avatar,
            });
        });
        socket.on('disconnect', () => setConnected(false));

        socket.on('mancala_lobby_state', (data: { players: LobbyPlayer[] }) => {
            setPlayers(data.players.filter((p) => p.userId !== options.userId));
        });

        socket.on('mancala_challenge_received', (data: IncomingChallenge) => {
            setIncoming(data);
        });

        socket.on('mancala_challenge_declined', () => {
            setOutgoing((prev) => (prev ? { ...prev, status: 'declined' } : null));
        });

        socket.on('mancala_match_started', (data: MatchInfo) => {
            setMatch(data);
            setResult(null);
            setLastMove(null);
            setIncoming(null);
            setOutgoing(null);
        });

        socket.on('mancala_match_state', (data: { matchId: string; state: MancalaState; lastMove?: LastMove }) => {
            setMatch((prev) => (prev && prev.matchId === data.matchId ? { ...prev, state: data.state } : prev));
            if (data.lastMove) setLastMove(data.lastMove);
        });

        socket.on(
            'mancala_match_ended',
            (data: { matchId: string; reason: 'finished' | 'forfeit'; forfeitedBy: string | null; state: MancalaState }) => {
                setMatch((prev) => (prev && prev.matchId === data.matchId ? { ...prev, state: data.state } : prev));
                setResult({ reason: data.reason, forfeitedBy: data.forfeitedBy });
            },
        );

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options?.instanceId, options?.userId]);

    const sendChallenge = useCallback((targetUserId: string) => {
        socketRef.current?.emit('mancala_challenge', { targetUserId });
        setOutgoing({ targetUserId, status: 'pending' });
    }, []);

    const respondToChallenge = useCallback(
        (accept: boolean) => {
            if (!incoming) return;
            socketRef.current?.emit('mancala_challenge_respond', {
                challengerUserId: incoming.challenger.userId,
                accept,
            });
            setIncoming(null);
        },
        [incoming],
    );

    const sendMove = useCallback(
        (pit: number) => {
            if (!match) return;
            socketRef.current?.emit('mancala_move', { matchId: match.matchId, pit });
        },
        [match],
    );

    const rematch = useCallback(() => {
        if (!match) return;
        socketRef.current?.emit('mancala_challenge', { targetUserId: match.opponent.userId });
        setOutgoing({ targetUserId: match.opponent.userId, status: 'pending' });
        setMatch(null);
        setResult(null);
        setLastMove(null);
    }, [match]);

    const leaveMatch = useCallback(() => {
        if (match) socketRef.current?.emit('mancala_leave_match', { matchId: match.matchId });
        setMatch(null);
        setResult(null);
        setLastMove(null);
    }, [match]);

    const dismissOutgoing = useCallback(() => setOutgoing(null), []);

    return {
        connected,
        players,
        incoming,
        outgoing,
        match,
        result,
        lastMove,
        sendChallenge,
        respondToChallenge,
        sendMove,
        rematch,
        leaveMatch,
        dismissOutgoing,
    };
}

// Dev/browser mock: a single "Mancala Bot" opponent that plays random legal
// moves, so the board is fully playable without a real second Discord client.
const BOT: Opponent = { userId: 'mancala-bot', username: 'Mancala Bot', avatar: null };

export function useMockMancala(self: { userId: string } | null): MancalaLobby {
    const [match, setMatch] = useState<MatchInfo | null>(null);
    const [result, setResult] = useState<MatchResult | null>(null);
    const [lastMove, setLastMove] = useState<LastMove | null>(null);
    const stateRef = useRef<MancalaState | null>(null);
    const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playRef = useRef<(seat: Seat, pit: number) => void>(() => {});

    const players: LobbyPlayer[] = [{ ...BOT, status: 'idle' }];

    // The bot plays its first legal move once the preceding sow animation has
    // finished (delay passed in by the caller) plus a short beat.
    const scheduleBot = useCallback((delay: number) => {
        if (botTimer.current) clearTimeout(botTimer.current);
        botTimer.current = setTimeout(() => {
            const cur = stateRef.current;
            if (cur && cur.status === 'playing' && cur.turn === 1) {
                const moves = legalMoves(cur, 1);
                if (moves.length > 0) playRef.current(1, moves[0]);
            }
        }, delay);
    }, []);

    // Apply a move against the ref-held authoritative state. Side effects live
    // here (not inside a setState updater) so React strict mode can't double-run them.
    const play = useCallback(
        (moveSeat: Seat, pit: number) => {
            const cur = stateRef.current;
            if (!cur || cur.status !== 'playing' || cur.turn !== moveSeat) return;
            if (!legalMoves(cur, moveSeat).includes(pit)) return;

            // How long this move's sow animation will run, so the bot can wait it out.
            const animMs = (sowPath(cur.pits, moveSeat, pit).length + 1) * SOW_STEP_MS;

            const next = applyMove(cur, pit);
            stateRef.current = next;
            setMatch((prev) => (prev ? { ...prev, state: next } : prev));
            setLastMove({ seat: moveSeat, pit });

            if (next.status === 'over') {
                setResult({ reason: 'finished', forfeitedBy: null });
            } else if (next.turn === 1) {
                scheduleBot(animMs + 400);
            }
        },
        [scheduleBot],
    );

    useEffect(() => {
        playRef.current = play;
    }, [play]);

    useEffect(() => () => {
        if (botTimer.current) clearTimeout(botTimer.current);
    }, []);

    const startMatch = useCallback(() => {
        const state = initialState(0);
        stateRef.current = state;
        setMatch({ matchId: 'mock', seat: 0, opponent: BOT, state });
        setResult(null);
        setLastMove(null);
    }, []);

    const sendChallenge = useCallback(() => startMatch(), [startMatch]);
    const rematch = useCallback(() => startMatch(), [startMatch]);
    const respondToChallenge = useCallback(() => {}, []);
    const dismissOutgoing = useCallback(() => {}, []);

    const leaveMatch = useCallback(() => {
        if (botTimer.current) clearTimeout(botTimer.current);
        stateRef.current = null;
        setMatch(null);
        setResult(null);
        setLastMove(null);
    }, []);

    const sendMove = useCallback((pit: number) => play(0, pit), [play]);

    void self;

    return {
        connected: true,
        players,
        incoming: null,
        outgoing: null,
        match,
        result,
        lastMove,
        sendChallenge,
        respondToChallenge,
        sendMove,
        rematch,
        leaveMatch,
        dismissOutgoing,
    };
}
