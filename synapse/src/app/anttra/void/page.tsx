'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';

const scattered = [
  { text: 'why',     top: '12%',  left: '72%', size: '0.65rem', opacity: 0.06 },
  { text: 'no',      top: '28%',  left: '18%', size: '0.55rem', opacity: 0.05 },
  { text: 'please',  top: '38%',  left: '60%', size: '0.6rem',  opacity: 0.04 },
  { text: 'stop',    top: '55%',  left: '80%', size: '0.7rem',  opacity: 0.07 },
  { text: 'run',     top: '62%',  left: '34%', size: '0.55rem', opacity: 0.05 },
  { text: 'no',      top: '74%',  left: '55%', size: '0.5rem',  opacity: 0.04 },
  { text: 'why',     top: '82%',  left: '12%', size: '0.6rem',  opacity: 0.06 },
  { text: 'please',  top: '88%',  left: '78%', size: '0.55rem', opacity: 0.04 },
  { text: 'stop',    top: '20%',  left: '42%', size: '0.5rem',  opacity: 0.03 },
  { text: 'AAAAA',   top: '47%',  left: '6%',  size: '0.45rem', opacity: 0.04 },
  { text: 'AAAAA',   top: '33%',  left: '88%', size: '0.45rem', opacity: 0.03 },
];

export default function VoidPage() {
  const root = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {

      gsap.from('.phrase-1', { opacity: 0, duration: 4, ease: 'power1.in', delay: 0.3 });
      gsap.from('.phrase-2', { opacity: 0, duration: 3, ease: 'power1.in', delay: 2.2 });
      gsap.from('.phrase-3', { opacity: 0, duration: 2.5, ease: 'power1.in', delay: 4 });
      gsap.from('.back-link', { opacity: 0, duration: 1, delay: 5 });

      gsap.from('.scattered-word', {
        opacity: 0, duration: 0.1,
        stagger: { each: 0.4, from: 'random' },
        delay: 1,
      });

      gsap.utils.toArray<HTMLElement>('.scattered-word').forEach((el) => {
        gsap.to(el, {
          opacity: 0,
          duration: 0.08,
          repeat: -1,
          yoyo: true,
          repeatDelay: gsap.utils.random(4, 18),
          ease: 'none',
        });
      });

      const shakeEl = (selector: string, intensity: number) => {
        gsap.to(selector, {
          x: () => gsap.utils.random(-intensity, intensity),
          y: () => gsap.utils.random(-intensity * 0.5, intensity * 0.5),
          duration: 0.06,
          repeat: 10,
          yoyo: true,
          ease: 'none',
          repeatRefresh: true,
          overwrite: true,
        });
      };

      const triggerShake = () => {
        shakeEl('.phrase-1', 5);
        setTimeout(() => shakeEl('.phrase-2', 3), 120);
        setTimeout(() => shakeEl('.phrase-3', 8), 60);
        setTimeout(triggerShake, gsap.utils.random(2500, 7000));
      };
      setTimeout(triggerShake, 3000);

      gsap.to('.ghost-text', {
        y: -18, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });

    }, root);

    const handleMove = (e: MouseEvent) => {
      if (!glowRef.current) return;
      gsap.to(glowRef.current, { x: e.clientX, y: e.clientY, duration: 0.8, ease: 'power2.out' });
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      ctx.revert();
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return (
    <div
      ref={root}
      style={{ backgroundColor: '#040404', color: '#d0d0d0', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      <div
        ref={glowRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, #6b000025 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <div
        className="ghost-text"
        style={{
          position: 'fixed', top: '15%', left: '-2%',
          fontFamily: 'monospace', fontWeight: 700,
          fontSize: 'clamp(8rem, 22vw, 20rem)',
          color: 'transparent',
          WebkitTextStroke: '1px rgba(208,208,208,0.03)',
          letterSpacing: '-0.04em',
          pointerEvents: 'none', userSelect: 'none',
          whiteSpace: 'nowrap', zIndex: 0,
        }}
      >
        anttra
      </div>

      {scattered.map((w, i) => (
        <span
          key={i}
          className="scattered-word"
          style={{
            position: 'fixed', top: w.top, left: w.left,
            fontFamily: 'monospace', fontSize: w.size,
            opacity: w.opacity, color: '#d0d0d0',
            pointerEvents: 'none', userSelect: 'none', letterSpacing: '0.1em',
          }}
        >
          {w.text}
        </span>
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '2rem', left: '3rem' }}>
          <Link
            href="/anttra"
            className="back-link font-mono text-xs"
            style={{ opacity: 0.15, color: '#d0d0d0' }}
          >
            ←
          </Link>
        </div>

        <section
          style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '0 clamp(2rem, 8vw, 8rem)', gap: '0.5rem',
          }}
        >
          <p
            className="phrase-1 font-mono"
            style={{ fontSize: 'clamp(1.6rem, 4.5vw, 3.8rem)', lineHeight: 1.25, maxWidth: '14ch', opacity: 0.88 }}
          >
            why did you have to insist.
          </p>
          <p
            className="phrase-2 font-mono"
            style={{ fontSize: 'clamp(1.6rem, 4.5vw, 3.8rem)', lineHeight: 1.25, maxWidth: '14ch', opacity: 0.6, marginLeft: 'clamp(1rem, 4vw, 4rem)' }}
          >
            Why did you have to come?
          </p>
          <p
            className="phrase-3 font-mono"
            style={{ fontSize: 'clamp(0.65rem, 1.2vw, 0.9rem)', opacity: 0.18, marginTop: '3rem', letterSpacing: '0.15em' }}
          >
            you should not have come here.
          </p>
        </section>
      </div>
    </div>
  );
}
