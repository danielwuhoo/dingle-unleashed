import { Server, Socket } from 'socket.io';
import { MancalaState, Seat, applyMove, initialState, isLegalMove } from './mancala-engine';

// Real-time 2-player Mancala with an explicit challenge lobby.
//
// Players sharing a Discord activity instance join the same lobby (keyed by
// instanceId). A player challenges another by userId; on accept, the server
// creates an authoritative match. Clients only send the pit they want to play;
// the server validates turn + legality and is the single source of truth.

interface LobbyUser {
    socketId: string;
    userId: string;
    username: string;
    avatar?: string | null;
    matchId: string | null; // current match, if any
}

interface MatchSeat {
    userId: string;
    username: string;
    avatar?: string | null;
}

interface Match {
    id: string;
    lobbyId: string;
    seats: [MatchSeat, MatchSeat]; // index === Seat
    state: MancalaState;
    over: boolean;
}

interface Lobby {
    id: string;
    users: Map<string, LobbyUser>; // keyed by userId
    matches: Map<string, Match>;
    // pending challenges: challengerUserId -> targetUserId
    challenges: Map<string, string>;
}

const lobbies = new Map<string, Lobby>();
let matchCounter = 0;

function getOrCreateLobby(id: string): Lobby {
    let lobby = lobbies.get(id);
    if (!lobby) {
        lobby = { id, users: new Map(), matches: new Map(), challenges: new Map() };
        lobbies.set(id, lobby);
    }
    return lobby;
}

function lobbyRoom(id: string): string {
    return `mancala:lobby:${id}`;
}

function matchRoom(id: string): string {
    return `mancala:match:${id}`;
}

function publicPlayer(u: LobbyUser) {
    return {
        userId: u.userId,
        username: u.username,
        avatar: u.avatar ?? null,
        status: u.matchId ? 'playing' : 'idle',
    };
}

function matchSummary(match: Match) {
    return { matchId: match.id, players: match.seats };
}

function broadcastLobby(io: Server, lobby: Lobby): void {
    const players = Array.from(lobby.users.values()).map(publicPlayer);
    const matches = Array.from(lobby.matches.values())
        .filter((m) => !m.over)
        .map(matchSummary);
    io.to(lobbyRoom(lobby.id)).emit('mancala_lobby_state', { players, matches });
}

function socketForUser(io: Server, socketId: string): Socket | undefined {
    return io.sockets.sockets.get(socketId);
}

function endMatch(io: Server, lobby: Lobby, match: Match, reason: 'finished' | 'forfeit', forfeitedBy?: string): void {
    match.over = true;
    for (const seat of match.seats) {
        const u = lobby.users.get(seat.userId);
        if (u && u.matchId === match.id) u.matchId = null;
    }
    lobby.matches.delete(match.id);
    io.to(matchRoom(match.id)).emit('mancala_match_ended', {
        matchId: match.id,
        reason,
        forfeitedBy: forfeitedBy ?? null,
        state: match.state,
    });
    broadcastLobby(io, lobby);
}

export function setupMancalaHandlers(io: Server): void {
    io.on('connection', (socket: Socket) => {
        let lobbyId: string | null = null;
        let userId: string | null = null;

        socket.on(
            'mancala_join',
            (data: { instanceId?: string; userId: string; username: string; avatar?: string | null }) => {
                // Single global lobby — everyone using the activity can challenge
                // each other regardless of which voice channel they launched from.
                lobbyId = 'global';
                userId = data.userId;
                const lobby = getOrCreateLobby(lobbyId);

                lobby.users.set(userId, {
                    socketId: socket.id,
                    userId,
                    username: data.username,
                    avatar: data.avatar,
                    matchId: lobby.users.get(userId)?.matchId ?? null,
                });
                socket.join(lobbyRoom(lobbyId));

                // If reconnecting into an existing match, resync the player.
                const existing = lobby.users.get(userId);
                if (existing?.matchId) {
                    const match = lobby.matches.get(existing.matchId);
                    if (match) {
                        socket.join(matchRoom(match.id));
                        const seat: Seat = match.seats[0].userId === userId ? 0 : 1;
                        socket.emit('mancala_match_started', {
                            matchId: match.id,
                            seat,
                            opponent: match.seats[seat === 0 ? 1 : 0],
                            state: match.state,
                        });
                    }
                }

                broadcastLobby(io, lobby);
            },
        );

        socket.on('mancala_challenge', (data: { targetUserId: string }) => {
            if (!lobbyId || !userId) return;
            const lobby = lobbies.get(lobbyId);
            if (!lobby) return;
            const challenger = lobby.users.get(userId);
            const target = lobby.users.get(data.targetUserId);
            if (!challenger || !target) return;
            if (challenger.matchId || target.matchId) return; // either side busy
            if (data.targetUserId === userId) return;

            lobby.challenges.set(userId, data.targetUserId);
            const targetSocket = socketForUser(io, target.socketId);
            targetSocket?.emit('mancala_challenge_received', {
                challenger: {
                    userId: challenger.userId,
                    username: challenger.username,
                    avatar: challenger.avatar ?? null,
                },
            });
        });

        socket.on('mancala_challenge_respond', (data: { challengerUserId: string; accept: boolean }) => {
            if (!lobbyId || !userId) return;
            const lobby = lobbies.get(lobbyId);
            if (!lobby) return;

            const pending = lobby.challenges.get(data.challengerUserId);
            if (pending !== userId) return; // no such challenge aimed at me
            lobby.challenges.delete(data.challengerUserId);

            const challenger = lobby.users.get(data.challengerUserId);
            const target = lobby.users.get(userId);
            if (!challenger || !target) return;

            if (!data.accept) {
                const challengerSocket = socketForUser(io, challenger.socketId);
                challengerSocket?.emit('mancala_challenge_declined', { byUserId: userId });
                return;
            }

            if (challenger.matchId || target.matchId) return; // became busy

            // Create the match. Challenger takes seat 0 (moves first).
            matchCounter += 1;
            const matchId = `m${matchCounter}`;
            const match: Match = {
                id: matchId,
                lobbyId: lobby.id,
                seats: [
                    { userId: challenger.userId, username: challenger.username, avatar: challenger.avatar ?? null },
                    { userId: target.userId, username: target.username, avatar: target.avatar ?? null },
                ],
                state: initialState(0),
                over: false,
            };
            lobby.matches.set(matchId, match);
            challenger.matchId = matchId;
            target.matchId = matchId;

            for (const seat of [0, 1] as Seat[]) {
                const u = lobby.users.get(match.seats[seat].userId);
                const s = u && socketForUser(io, u.socketId);
                if (s) {
                    s.join(matchRoom(matchId));
                    s.emit('mancala_match_started', {
                        matchId,
                        seat,
                        opponent: match.seats[seat === 0 ? 1 : 0],
                        state: match.state,
                    });
                }
            }
            broadcastLobby(io, lobby);
        });

        socket.on('mancala_move', (data: { matchId: string; pit: number }) => {
            if (!lobbyId || !userId) return;
            const lobby = lobbies.get(lobbyId);
            const match = lobby?.matches.get(data.matchId);
            if (!lobby || !match || match.over) return;

            let seat: Seat;
            if (match.seats[0].userId === userId) seat = 0;
            else if (match.seats[1].userId === userId) seat = 1;
            else return; // not a player in this match
            if (match.state.turn !== seat) return; // not your turn
            if (!isLegalMove(match.state, seat, data.pit)) return;

            match.state = applyMove(match.state, data.pit);
            io.to(matchRoom(match.id)).emit('mancala_match_state', {
                matchId: match.id,
                state: match.state,
                lastMove: { seat, pit: data.pit },
            });

            if (match.state.status === 'over') {
                endMatch(io, lobby, match, 'finished');
            }
        });

        socket.on('mancala_spectate', (data: { matchId: string }) => {
            if (!lobbyId) return;
            const lobby = lobbies.get(lobbyId);
            const match = lobby?.matches.get(data.matchId);
            if (!lobby || !match || match.over) return;
            socket.join(matchRoom(match.id));
            socket.emit('mancala_spectate_state', {
                matchId: match.id,
                players: match.seats,
                state: match.state,
            });
        });

        socket.on('mancala_stop_spectate', (data: { matchId: string }) => {
            socket.leave(matchRoom(data.matchId));
        });

        socket.on('mancala_rematch', (data: { matchId: string }) => {
            if (!lobbyId || !userId) return;
            const lobby = lobbies.get(lobbyId);
            if (!lobby) return;
            // A rematch is just a fresh challenge to the same opponent; the client
            // re-challenges via mancala_challenge, so nothing special is needed here.
            // Kept for forward-compat / explicit intent.
            void data;
        });

        socket.on('mancala_leave_match', (data: { matchId: string }) => {
            if (!lobbyId || !userId) return;
            const lobby = lobbies.get(lobbyId);
            const match = lobby?.matches.get(data.matchId);
            if (!lobby || !match) return;
            socket.leave(matchRoom(match.id));
            if (!match.over) endMatch(io, lobby, match, 'forfeit', userId);
        });

        socket.on('disconnect', () => {
            if (!lobbyId || !userId) return;
            const lobby = lobbies.get(lobbyId);
            if (!lobby) return;

            const user = lobby.users.get(userId);
            // Only treat as a real departure if this socket is the user's current one
            // (guards against a stale tab's disconnect clobbering a reconnect).
            if (user && user.socketId !== socket.id) return;

            // Forfeit any live match.
            if (user?.matchId) {
                const match = lobby.matches.get(user.matchId);
                if (match && !match.over) endMatch(io, lobby, match, 'forfeit', userId);
            }

            // Clear any pending challenges involving this user.
            for (const [challenger, target] of lobby.challenges) {
                if (challenger === userId || target === userId) lobby.challenges.delete(challenger);
            }

            lobby.users.delete(userId);
            if (lobby.users.size === 0) {
                lobbies.delete(lobbyId);
            } else {
                broadcastLobby(io, lobby);
            }
        });
    });
}
