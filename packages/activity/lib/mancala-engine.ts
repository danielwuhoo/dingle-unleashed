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

// Configurable rule variations. Defaults reproduce standard Kalah.
export interface RuleConfig {
    multiLap: boolean; // relay sowing (Congkak/Ayoayo): land on a non-empty pit → scoop and continue
    pieRule: boolean; // second player may swap sides after the first player's first turn
    randomStart: boolean; // randomized, mirrored starting distribution (same total)
}

export const DEFAULT_RULES: RuleConfig = { multiLap: false, pieRule: false, randomStart: false };

// One "lap" of sowing: the source pit and the ordered wells that each receive a stone.
export interface Lap {
    from: number;
    path: number[];
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

// Randomly drop `total` stones into `bins` wells (each ≥ 0).
function randomDistribution(bins: number, total: number): number[] {
    const arr = new Array<number>(bins).fill(0);
    for (let i = 0; i < total; i += 1) arr[Math.floor(Math.random() * bins)] += 1;
    return arr;
}

export function initialState(firstTurn: Seat = 0, config: RuleConfig = DEFAULT_RULES): MancalaState {
    const pits = new Array<number>(14).fill(0);
    if (config.randomStart) {
        // Mirror the two sides (pit i ↔ pit i+7) so the start is fair; same 48 total.
        const side = randomDistribution(PITS_PER_SIDE, STONES_PER_PIT * PITS_PER_SIDE);
        for (let i = 0; i < PITS_PER_SIDE; i += 1) {
            pits[i] = side[i];
            pits[i + 7] = side[i];
        }
    } else {
        for (const i of [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12]) pits[i] = STONES_PER_PIT;
    }
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

// Sows from `startPit` for `seat`, relaying through non-empty wells when
// multiLap is on. Returns the resulting board (no capture applied), the laps
// for animation, and the index of the final stone.
function simulateSow(
    pits: number[],
    seat: Seat,
    startPit: number,
    multiLap: boolean,
): { pits: number[]; laps: Lap[]; last: number } {
    const result = pits.slice();
    const opponentStore = STORE[seat === 0 ? 1 : 0];
    const laps: Lap[] = [];
    let from = startPit;
    let last = startPit;

    for (let guard = 0; guard < 500; guard += 1) {
        let stones = result[from];
        result[from] = 0;
        let index = from;
        const path: number[] = [];
        while (stones > 0) {
            do {
                index = (index + 1) % 14;
            } while (index === opponentStore);
            result[index] += 1;
            path.push(index);
            stones -= 1;
        }
        laps.push({ from, path });
        last = index;
        // Relay: last stone landed in a non-empty (now ≥2) non-store well → scoop and continue.
        if (multiLap && !isStore(index) && result[index] >= 2) {
            from = index;
            continue;
        }
        break;
    }

    return { pits: result, laps, last };
}

// Applies a move for the player whose turn it currently is. Returns a new state.
// Throws if the move is illegal — callers should validate first (server does).
export function applyMove(state: MancalaState, pit: number, config: RuleConfig = DEFAULT_RULES): MancalaState {
    const seat = state.turn;
    if (!isLegalMove(state, seat, pit)) {
        throw new Error(`Illegal move: pit ${pit} for seat ${seat}`);
    }

    const { pits, last } = simulateSow(state.pits, seat, pit, config.multiLap);

    // Capture: last stone landed in a now-single (previously empty) pit on own side,
    // and the opposite pit has stones — sweep both into own store.
    if (!isStore(last) && ownsPit(seat, last) && pits[last] === 1) {
        const opposite = oppositePit(last);
        if (pits[opposite] > 0) {
            pits[STORE[seat]] += pits[opposite] + 1;
            pits[opposite] = 0;
            pits[last] = 0;
        }
    }

    // Extra turn if the last stone landed in own store.
    const extraTurn = last === STORE[seat];

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

// The laps of a move, for the UI to animate (relay-aware). Does not apply
// captures — the caller settles to the final state afterwards.
export function sowSequence(pits: number[], seat: Seat, pit: number, config: RuleConfig = DEFAULT_RULES): Lap[] {
    return simulateSow(pits, seat, pit, config.multiLap).laps;
}
