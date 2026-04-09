'use client';

import { useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const QUOTES = [
  "Man is a god who shits.",
  "The worm at the core of all our biological pretenses.",
  "A creator with a mind that soars to the stars, yet trapped in a carcass that rots.",
  "We are puppets, and the strings are made of our own fear.",
  "Consciousness is a tragic misstep in evolution.",
  "To be is to be cornered.",
  "The only thing that matters is the terror of being.",
  "Everything is a deviation from the silence of the grave.",
  "We are lived by powers we do not understand.",
  "The irony of the human condition: the deepest need is to be free of the anxiety of death, but the only way to be free is to die.",
  "A nightmare from which you cannot wake.",
  "Nature's revenge on the spirit.",
  "Your name is a lie told to a ghost.",
  "The biological trap is closing, and you are inside.",
  "We build towers of meaning to hide the fact that we are food for worms.",
];

// ── corruption palette ──────────────────────────────────────────────────────
const MUD = [
  [38,  6,  4],
  [55,  9,  6],
  [28, 10,  5],
  [72, 12,  8],
  [20,  7,  4],
  [85, 15, 10],
  [45,  8,  5],
];

function rnd(min: number, max: number) { return min + Math.random() * (max - min); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

interface Drip {
  x: number; y: number;
  vx: number; vy: number;
  width: number;
  trail: { x: number; y: number; w: number }[];
  color: number[];
  alpha: number;
  done: boolean;
}

interface Stain {
  x: number; y: number;
  r: number; maxR: number;
  growRate: number;
  offsets: number[];   // radial shape offsets per angular slice
  color: number[];
  alpha: number;
}

function spawnDrip(W: number, H: number, x?: number, y?: number): Drip {
  return {
    x: x ?? rnd(0.05, 0.95) * W,
    y: y ?? rnd(0, 0.3) * H,
    vx: rnd(-0.15, 0.15),
    vy: rnd(0.25, 0.9),
    width: rnd(4, 14),
    trail: [],
    color: MUD[Math.floor(Math.random() * MUD.length)],
    alpha: rnd(0.7, 0.92),
    done: false,
  };
}

function spawnStain(W: number, H: number, x?: number, y?: number): Stain {
  const slices = 48;
  return {
    x: x ?? rnd(0.05, 0.95) * W,
    y: y ?? rnd(0.05, 0.95) * H,
    r: 2,
    maxR: rnd(40, 180),
    growRate: rnd(0.08, 0.35),
    offsets: Array.from({ length: slices }, () => rnd(0.55, 1.35)),
    color: MUD[Math.floor(Math.random() * MUD.length)],
    alpha: 0,
  };
}

// draw one stain frame-by-frame (no-clear canvas accumulates naturally)
function drawStain(ctx: CanvasRenderingContext2D, s: Stain, tick: number) {
  const slices = s.offsets.length;
  ctx.beginPath();
  for (let i = 0; i <= slices; i++) {
    const angle = (i / slices) * Math.PI * 2;
    // slow living wobble
    const wobble = 1 + 0.06 * Math.sin(tick * 0.018 + i * 1.9 + s.x);
    const r = s.r * s.offsets[i % slices] * wobble;
    const px = s.x + Math.cos(angle) * r;
    const py = s.y + Math.sin(angle) * r * 1.15; // slightly taller than wide
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const [r, g, b] = s.color;
  ctx.fillStyle = `rgba(${r},${g},${b},${s.alpha * 0.06})`;
  ctx.fill();
}

export default function VoidPage() {
  const container   = useRef<HTMLDivElement>(null);
  const corruptRef  = useRef<HTMLCanvasElement>(null);

  const stream = useMemo(() =>
    [...QUOTES, ...QUOTES].map((text) => ({
      text,
      x:        rnd(5, 75) + '%',
      delay:    rnd(0, 20),
      duration: rnd(30, 50),
      size:     rnd(0.8, 2.3) + 'rem',
    })), []);

  // ── GSAP quotes ────────────────────────────────────────────────────────────
  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>('.quote-item').forEach((el, i) => {
      gsap.to(el, { y: '-120vh', duration: stream[i].duration, delay: stream[i].delay, repeat: -1, ease: 'none' });
      gsap.to(el, { x: '+=30', duration: rnd(3, 6), repeat: -1, yoyo: true, ease: 'sine.inOut' });
    });
    gsap.to('.vignette', { opacity: 0.5, scale: 1.1, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    const onMove = (e: MouseEvent) => gsap.to('.shadow-light', { x: e.clientX, y: e.clientY, ease: 'power2.out' });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, { scope: container });

  // ── corruption canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = corruptRef.current!;
    const ctx    = canvas.getContext('2d')!;
    let animFrame: number;
    let tick = 0;
    let spawnClock = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.width, H = () => canvas.height;

    const drips:  Drip[]  = [];
    const stains: Stain[] = [];

    // seed: one central corruption point to start
    stains.push(spawnStain(W(), H(), W() * rnd(0.3, 0.7), H() * rnd(0.3, 0.7)));
    drips.push(spawnDrip(W(), H()));

    function draw() {
      animFrame = requestAnimationFrame(draw);
      tick++;
      spawnClock++;

      // spawn schedule — slowly escalate
      if (spawnClock % 220 === 0) drips.push(spawnDrip(W(), H()));
      if (spawnClock % 340 === 0) stains.push(spawnStain(W(), H()));

      // ── stains ────────────────────────────────────────────────────────
      for (const s of stains) {
        if (s.r < s.maxR) {
          s.r     += s.growRate;
          s.alpha  = Math.min(0.82, s.alpha + 0.003);
        }
        drawStain(ctx, s, tick);
      }

      // ── drips ─────────────────────────────────────────────────────────
      for (const d of drips) {
        if (d.done) continue;
        // gravity + slight horizontal wobble
        d.vy  = Math.min(d.vy + 0.008, 2.2);
        d.vx += (Math.random() - 0.5) * 0.04;
        d.vx *= 0.96;
        d.x  += d.vx;
        d.y  += d.vy;
        // taper width as it descends
        d.width = Math.max(1.2, d.width - 0.006);

        d.trail.push({ x: d.x, y: d.y, w: d.width });
        if (d.trail.length > 3) {
          const t = d.trail;
          const a = t[t.length - 2], b = t[t.length - 1];
          const [r, g, bl] = d.color;
          // thick muddy core
          ctx.beginPath();
          ctx.moveTo(a.x - a.w / 2, a.y);
          ctx.lineTo(b.x - b.w / 2, b.y);
          ctx.lineTo(b.x + b.w / 2, b.y);
          ctx.lineTo(a.x + a.w / 2, a.y);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${bl},${d.alpha})`;
          ctx.fill();
          // dim halo around drip
          ctx.beginPath();
          ctx.moveTo(a.x - a.w * 1.8, a.y);
          ctx.lineTo(b.x - b.w * 1.8, b.y);
          ctx.lineTo(b.x + b.w * 1.8, b.y);
          ctx.lineTo(a.x + a.w * 1.8, a.y);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${bl},${d.alpha * 0.15})`;
          ctx.fill();
        }

        if (d.y > H() + 30) {
          d.done = true;
          // spawn a puddle where it lands
          stains.push(spawnStain(W(), H(), d.x, H() - 2));
        }
      }

      // very subtle overall darkening — makes it feel like rot spreading
      ctx.fillStyle = 'rgba(4,1,0,0.004)';
      ctx.fillRect(0, 0, W(), H());
    }

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <main
      ref={container}
      className="relative min-h-screen bg-[#080402] text-[#9a918a] overflow-hidden select-none font-serif antialiased"
    >
      {/* corruption layer — behind everything */}
      <canvas
        ref={corruptRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ mixBlendMode: 'normal' }}
      />

      <div className="vignette fixed inset-0 z-40 pointer-events-none"
           style={{ boxShadow: 'inset 0 0 220px rgba(0,0,0,0.95)' }} />

      <div className="shadow-light fixed top-0 left-0 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-30 opacity-70"
           style={{ background: 'radial-gradient(circle, rgba(0,0,0,1) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full h-screen">
        {stream.map((item, i) => (
          <p key={i} className="quote-item absolute italic opacity-0"
             style={{ left: item.x, top: '110%', fontSize: item.size, maxWidth: '300px',
                      animation: 'fadeIn 2s forwards', animationDelay: `${item.delay}s` }}>
            {item.text}
          </p>
        ))}
      </div>

      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="text-6xl md:text-8xl font-light opacity-10 tracking-widest lowercase italic mix-blend-difference">
          zero fortune
        </h1>
      </div>

      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
        <Link href="/anttra"
              className="text-xs italic tracking-[0.4em] opacity-20 hover:opacity-100 hover:text-white transition-all duration-1000">
          I want to return
        </Link>
      </nav>

      {/* grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] mix-blend-multiply z-50"
           style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/asfalt-light.png')" }} />

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 0.3; } }
      `}</style>
    </main>
  );
}
