// Pure Mancala (Kalah) game engine. No I/O — safe to run on both client and server.
//
// Board layout (14 pits, indices 0..13):
//
//        12  11  10   9   8   7        <- player 1's pits
//   [13]                          [6]   <- stores (13 = player 1, 6 = player 0)
//         0   1   2   3   4   5        <- player 0's pits
//
// Player 0 owns pits 0..5 and store 6. Player 1 owns pits 7..12 and store 13.
// Sowing goes in increasing index order (mod 14), skipping the opponent's store.

export type Seat = 0 | 1;
export type MancalaStatus = 'playing' | 'over';

export interface MancalaState {
    pits: number[]; // length 14
    turn: Seat;
    status: MancalaStatus;
    winner: Seat | 'draw' | null; // null while playing
}

export const PITS_PER_SIDE = 6;
export const STONES_PER_PIT = 4;

export const STORE: Record<Seat, number> = { 0: 6, 1: 13 };

export function pitsForSeat(seat: Seat): number[] {
    return seat === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
}

export function isStore(index: number): boolean {
    return index === 6 || index === 13;
}

function ownsPit(seat: Seat, index: number): boolean {
    return seat === 0 ? index >= 0 && index <= 5 : index >= 7 && index <= 12;
}

// The pit directly across the board, used for captures (0<->12, 1<->11, ... 5<->7).
function oppositePit(index: number): number {
    return 12 - index;
}

export function initialState(firstTurn: Seat = 0): MancalaState {
    const pits = new Array<number>(14).fill(STONES_PER_PIT);
    pits[STORE[0]] = 0;
    pits[STORE[1]] = 0;
    return { pits, turn: firstTurn, status: 'playing', winner: null };
}

export function legalMoves(state: MancalaState, seat: Seat): number[] {
    if (state.status !== 'playing' || state.turn !== seat) return [];
    return pitsForSeat(seat).filter((p) => state.pits[p] > 0);
}

export function isLegalMove(state: MancalaState, seat: Seat, pit: number): boolean {
    return legalMoves(state, seat).includes(pit);
}

function sideIsEmpty(pits: number[], seat: Seat): boolean {
    return pitsForSeat(seat).every((p) => pits[p] === 0);
}

// Applies a move for the player whose turn it currently is. Returns a new state.
// Throws if the move is illegal — callers should validate first (server does).
export function applyMove(state: MancalaState, pit: number): MancalaState {
    const seat = state.turn;
    if (!isLegalMove(state, seat, pit)) {
        throw new Error(`Illegal move: pit ${pit} for seat ${seat}`);
    }

    const pits = state.pits.slice();
    const opponentStore = STORE[seat === 0 ? 1 : 0];

    let stones = pits[pit];
    pits[pit] = 0;
    let index = pit;

    while (stones > 0) {
        index = (index + 1) % 14;
        if (index === opponentStore) continue; // never sow into opponent's store
        pits[index] += 1;
        stones -= 1;
    }

    // Capture: last stone landed in a now-single (previously empty) pit on own side,
    // and the opposite pit has stones — sweep both into own store.
    if (!isStore(index) && ownsPit(seat, index) && pits[index] === 1) {
        const opposite = oppositePit(index);
        if (pits[opposite] > 0) {
            pits[STORE[seat]] += pits[opposite] + 1;
            pits[opposite] = 0;
            pits[index] = 0;
        }
    }

    // Extra turn if the last stone landed in own store.
    const extraTurn = index === STORE[seat];

    const next: MancalaState = {
        pits,
        turn: extraTurn ? seat : (seat === 0 ? 1 : 0),
        status: 'playing',
        winner: null,
    };

    // Game over when either side's pits are all empty. Remaining stones go to
    // their owner's store.
    if (sideIsEmpty(pits, 0) || sideIsEmpty(pits, 1)) {
        for (const p of pitsForSeat(0)) {
            pits[STORE[0]] += pits[p];
            pits[p] = 0;
        }
        for (const p of pitsForSeat(1)) {
            pits[STORE[1]] += pits[p];
            pits[p] = 0;
        }
        next.status = 'over';
        const s0 = pits[STORE[0]];
        const s1 = pits[STORE[1]];
        next.winner = s0 === s1 ? 'draw' : s0 > s1 ? 0 : 1;
        next.turn = seat; // turn is meaningless once over; leave it stable
    }

    return next;
}

export function scoreFor(state: MancalaState, seat: Seat): number {
    return state.pits[STORE[seat]];
}

// The ordered list of pit indices that each receive one stone when `seat` sows
// from `pit`, given a board `pits`. Used by the UI to animate the sow. Does not
// account for captures — the caller settles to the final state afterwards.
export function sowPath(pits: number[], seat: Seat, pit: number): number[] {
    const opponentStore = STORE[seat === 0 ? 1 : 0];
    let stones = pits[pit];
    let index = pit;
    const path: number[] = [];
    while (stones > 0) {
        do {
            index = (index + 1) % 14;
        } while (index === opponentStore);
        path.push(index);
        stones -= 1;
    }
    return path;
}
