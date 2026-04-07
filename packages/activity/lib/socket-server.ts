import { Server, Socket } from 'socket.io';
import { getLetterStates, LetterState } from './wordle-utils';
import { getPuzzleByDate } from './db';

export interface PlayerState {
    userId: string;
    username: string;
    avatar?: string | null;
    rows: LetterState[][];
    guesses: string[];
    gameStatus: 'playing' | 'won' | 'lost';
    letterCount: number;
    currentWord: string;
}

interface RoomState {
    date: string;
    solution: string;
    players: Map<string, PlayerState>;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(date: string): RoomState {
    let room = rooms.get(date);
    if (!room) {
        const puzzle = getPuzzleByDate(date);
        room = {
            date,
            solution: puzzle?.solution ?? '',
            players: new Map(),
        };
        rooms.set(date, room);
    }
    return room;
}

function computeRows(guesses: string[], solution: string): LetterState[][] {
    return guesses.map((g) => getLetterStates(g, solution));
}

export function setupSocketHandlers(io: Server): void {
    io.on('connection', (socket: Socket) => {
        let currentRoom: string | null = null;

        socket.on('join', (data: { userId: string; username: string; avatar?: string | null; date: string; guesses?: string[]; gameStatus?: string }) => {
            const room = getOrCreateRoom(data.date);
            currentRoom = data.date;

            const guesses = data.guesses ?? [];
            const rows = guesses.length > 0 ? computeRows(guesses, room.solution) : [];
            const player: PlayerState = {
                userId: data.userId,
                username: data.username,
                avatar: data.avatar,
                rows,
                guesses,
                gameStatus: (data.gameStatus as PlayerState['gameStatus']) || 'playing',
                letterCount: 0,
                currentWord: '',
            };

            room.players.set(socket.id, player);
            socket.join(data.date);

            const otherPlayers = Array.from(room.players.entries())
                .filter(([id]) => id !== socket.id)
                .map(([, p]) => p);
            socket.emit('room_state', { players: otherPlayers });

            socket.to(data.date).emit('player_joined', player);
        });

        socket.on('typing', (data: { letterCount: number; currentWord: string }) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            const player = room?.players.get(socket.id);
            if (!player) return;

            player.letterCount = data.letterCount;
            player.currentWord = data.currentWord;
            socket.to(currentRoom).emit('player_typing', {
                userId: player.userId,
                letterCount: data.letterCount,
                currentWord: data.currentWord,
            });
        });

        socket.on('guess', (data: { word: string; guesses: string[]; gameStatus: string }) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            const player = room?.players.get(socket.id);
            if (!room || !player || !room.solution) return;

            const newRow = getLetterStates(data.word, room.solution);
            player.rows.push(newRow);
            player.guesses.push(data.word);
            player.gameStatus = data.gameStatus as PlayerState['gameStatus'];
            player.letterCount = 0;
            player.currentWord = '';

            socket.to(currentRoom).emit('player_guess', {
                userId: player.userId,
                row: newRow,
                word: data.word,
                gameStatus: player.gameStatus,
            });
        });

        socket.on('shake', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            const player = room?.players.get(socket.id);
            if (!player) return;

            socket.to(currentRoom).emit('player_shake', {
                userId: player.userId,
            });
        });

        socket.on('disconnect', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            const player = room?.players.get(socket.id);
            if (player) {
                socket.to(currentRoom).emit('player_left', {
                    userId: player.userId,
                });
            }
            room?.players.delete(socket.id);

            if (room && room.players.size === 0) {
                rooms.delete(currentRoom);
            }
        });
    });
}
