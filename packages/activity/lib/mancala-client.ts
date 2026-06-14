'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MancalaState, Seat, applyMove, initialState, legalMoves } from './mancala-engine';

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

export interface MancalaLobby {
    connected: boolean;
    players: LobbyPlayer[];
    incoming: IncomingChallenge | null;
    outgoing: OutgoingChallenge | null;
    match: MatchInfo | null;
    result: MatchResult | null;
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
            setIncoming(null);
            setOutgoing(null);
        });

        socket.on('mancala_match_state', (data: { matchId: string; state: MancalaState }) => {
            setMatch((prev) => (prev && prev.matchId === data.matchId ? { ...prev, state: data.state } : prev));
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
    }, [match]);

    const leaveMatch = useCallback(() => {
        if (match) socketRef.current?.emit('mancala_leave_match', { matchId: match.matchId });
        setMatch(null);
        setResult(null);
    }, [match]);

    const dismissOutgoing = useCallback(() => setOutgoing(null), []);

    return {
        connected,
        players,
        incoming,
        outgoing,
        match,
        result,
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
    const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const players: LobbyPlayer[] = [{ ...BOT, status: 'idle' }];

    const finishIfOver = useCallback((state: MancalaState) => {
        if (state.status === 'over') setResult({ reason: 'finished', forfeitedBy: null });
    }, []);

    // Bot plays after the human, whenever it's the bot's turn (seat 1).
    const scheduleBot = useCallback(
        (state: MancalaState) => {
            if (botTimer.current) clearTimeout(botTimer.current);
            if (state.status !== 'playing' || state.turn !== 1) return;
            botTimer.current = setTimeout(() => {
                setMatch((prev) => {
                    if (!prev || prev.state.status !== 'playing' || prev.state.turn !== 1) return prev;
                    const moves = legalMoves(prev.state, 1);
                    if (moves.length === 0) return prev;
                    // Deterministic-ish pick (no Math.random dependency needed): first legal.
                    const next = applyMove(prev.state, moves[0]);
                    finishIfOver(next);
                    const updated = { ...prev, state: next };
                    scheduleBot(next);
                    return updated;
                });
            }, 600);
        },
        [finishIfOver],
    );

    useEffect(() => () => {
        if (botTimer.current) clearTimeout(botTimer.current);
    }, []);

    const startMatch = useCallback(() => {
        const state = initialState(0);
        setMatch({ matchId: 'mock', seat: 0, opponent: BOT, state });
        setResult(null);
    }, []);

    const sendChallenge = useCallback(() => startMatch(), [startMatch]);
    const rematch = useCallback(() => startMatch(), [startMatch]);
    const respondToChallenge = useCallback(() => {}, []);
    const dismissOutgoing = useCallback(() => {}, []);

    const leaveMatch = useCallback(() => {
        if (botTimer.current) clearTimeout(botTimer.current);
        setMatch(null);
        setResult(null);
    }, []);

    const sendMove = useCallback(
        (pit: number) => {
            setMatch((prev) => {
                if (!prev || prev.state.turn !== 0 || prev.state.status !== 'playing') return prev;
                if (!legalMoves(prev.state, 0).includes(pit)) return prev;
                const next = applyMove(prev.state, pit);
                finishIfOver(next);
                scheduleBot(next);
                return { ...prev, state: next };
            });
        },
        [finishIfOver, scheduleBot],
    );

    void self;

    return {
        connected: true,
        players,
        incoming: null,
        outgoing: null,
        match,
        result,
        sendChallenge,
        respondToChallenge,
        sendMove,
        rematch,
        leaveMatch,
        dismissOutgoing,
    };
}
