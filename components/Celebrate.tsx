"use client";
import { useEffect, useRef } from "react";

/** Fires confetti + a little fanfare when `winner` turns into `me` during this visit (not when opening an old win). */
export function useCelebrate(winner: string | null | undefined, me: string) {
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const was = prev.current;
    prev.current = winner;
    if (was === null && winner === me) celebrate();
  }, [winner, me]);
}

const COLORS = ["#fe5f55", "#0b9bff", "#ffcd75", "#38b764", "#f4f4f4", "#ff8f00"];

function celebrate() {
  fanfare();
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1000;image-rendering:pixelated";
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const W = innerWidth, H = innerHeight;
  const bits = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.45,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6,
    s: 5 + Math.random() * 6, c: COLORS[(Math.random() * COLORS.length) | 0], spin: Math.random() * 6, w: (Math.random() - 0.5) * 0.4,
  }));
  const t0 = performance.now();
  let last = t0;
  (function frame(t: number) {
    const dt = Math.min(2, (t - last) / 16);
    last = t;
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.vy += 0.5 * dt; b.vx *= 0.99; b.x += b.vx * dt; b.y += b.vy * dt; b.spin += b.w * dt;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin); ctx.fillStyle = b.c;
      ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); // pixel confetti: flat rectangles
      ctx.restore();
    }
    if (t - t0 < 3200 && bits.some((b) => b.y < H + 20)) requestAnimationFrame(frame);
    else c.remove();
  })(t0);
}

/** C major arpeggio on a square wave. No asset, no dependency. */
function fanfare() {
  try {
    const ac = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1046.5];
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "square"; o.frequency.value = f;
      const t = ac.currentTime + i * 0.11 + (i === 4 ? 0.12 : 0);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (i === 4 ? 0.5 : 0.14));
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.6);
    });
    setTimeout(() => ac.close(), 2000);
  } catch { /* no audio: still confetti */ }
}
