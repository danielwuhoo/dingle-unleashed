'use client';

import { useCallback, useEffect, useState } from 'react';

// Tiny synthesized sound effects via the Web Audio API — no audio assets to
// bundle. All sounds are short blips/arpeggios. Safe to call from event
// handlers/effects; no-ops on the server or when muted.

const MUTE_KEY = 'mancala-muted';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
}

function isMuted(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MUTE_KEY) === '1';
}

function blip(freq: number, durationMs: number, type: OscillatorType, gain: number, delayMs = 0): void {
    const audio = getCtx();
    if (!audio) return;
    const start = audio.currentTime + delayMs / 1000;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(start);
    osc.stop(start + durationMs / 1000 + 0.02);
}

// A soft wooden "tick" as each stone is sown. Index varies the pitch slightly
// so a long sow sounds like a little melody rather than a monotone.
export function playTick(index = 0): void {
    if (isMuted()) return;
    blip(460 + (index % 5) * 28, 70, 'triangle', 0.05);
}

export function playCapture(): void {
    if (isMuted()) return;
    [659, 784, 988].forEach((f, i) => blip(f, 160, 'sine', 0.06, i * 55));
}

export function playWin(): void {
    if (isMuted()) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, 240, 'sine', 0.07, i * 110));
}

export function playLose(): void {
    if (isMuted()) return;
    [392, 330, 262].forEach((f, i) => blip(f, 260, 'sine', 0.05, i * 130));
}

// React hook for the mute toggle, persisted to localStorage.
export function useMute(): { muted: boolean; toggle: () => void } {
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        setMuted(isMuted());
    }, []);

    const toggle = useCallback(() => {
        setMuted((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
            return next;
        });
    }, []);

    return { muted, toggle };
}
