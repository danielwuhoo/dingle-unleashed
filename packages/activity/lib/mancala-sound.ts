'use client';

import { useCallback, useEffect, useState } from 'react';

// Tiny synthesized sound effects via the Web Audio API — no audio assets to
// bundle. Wooden knocks for sown stones, a swish on scoop, chimes for
// captures/extra-turns/wins. Safe to call from event handlers/effects; no-ops
// on the server or when muted.

const MUTE_KEY = 'mancala-muted';

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

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

function noise(audio: AudioContext): AudioBuffer {
    if (!noiseBuf) {
        noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.2), audio.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
}

function isMuted(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MUTE_KEY) === '1';
}

// A pure tone with an attack/decay envelope — used for chimes.
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

// A short pitch-dropping "tok" — reads as wood. Plus a faint noise clack on top.
function knock(freq: number, gain: number): void {
    const audio = getCtx();
    if (!audio) return;
    const t = audio.currentTime;
    const decay = 0.09;

    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + decay);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(t);
    osc.stop(t + decay + 0.02);

    const src = audio.createBufferSource();
    src.buffer = noise(audio);
    const bp = audio.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100 + Math.random() * 700;
    bp.Q.value = 0.8;
    const ng = audio.createGain();
    ng.gain.setValueAtTime(gain * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(audio.destination);
    src.start(t);
    src.stop(t + 0.05);
}

function buzz(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
            navigator.vibrate(pattern);
        } catch {
            /* ignore */
        }
    }
}

// A sown stone landing in a well. Lower/rounder when it drops into a store.
export function playTick(index = 0, intoStore = false): void {
    if (isMuted()) return;
    const base = intoStore ? 200 : 300;
    knock(base + (index % 5) * 18 + Math.random() * 30, intoStore ? 0.09 : 0.06);
    buzz(intoStore ? 14 : 7);
}

// Scooping the handful out of a pit — a soft filtered-noise swish.
export function playScoop(): void {
    if (isMuted()) return;
    const audio = getCtx();
    if (!audio) return;
    const t = audio.currentTime;
    const src = audio.createBufferSource();
    src.buffer = noise(audio);
    const bp = audio.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
    bp.Q.value = 0.7;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(bp);
    bp.connect(g);
    g.connect(audio.destination);
    src.start(t);
    src.stop(t + 0.2);
    buzz(10);
}

export function playCapture(): void {
    if (isMuted()) return;
    [659, 784, 988].forEach((f, i) => blip(f, 160, 'sine', 0.06, i * 55));
    buzz([14, 30, 14]);
}

export function playExtraTurn(): void {
    if (isMuted()) return;
    [784, 1047].forEach((f, i) => blip(f, 150, 'sine', 0.06, i * 90));
    buzz([10, 20, 10]);
}

export function playWin(): void {
    if (isMuted()) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, 240, 'sine', 0.07, i * 110));
    buzz([20, 40, 20, 40, 60]);
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
