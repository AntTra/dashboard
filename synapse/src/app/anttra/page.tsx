'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

// ─── data ────────────────────────────────────────────────────────────────────

type ShowcaseItem = {
  label: string; sub: string; href: string; accent: string; live: boolean;
  imgSrc?: string; cssBg?: string;
};

const showcase: ShowcaseItem[] = [
  { label: 'CV',                  sub: 'BIOGRAPHY',       href: '/anttra/cv',        accent: '#d0c090', live: true,  cssBg: 'linear-gradient(135deg, #0c0c10 0%, #181820 100%)' },
  { label: 'BUSROUTES - TRONDHEIM',           sub: 'REAL-TIME TRANSIT MAP',href: '/anttra/busroutes', accent: '#00e5a0', live: true,  imgSrc: '/busroutes.png' },
  { label: 'VERTEX GLOBES',       sub: '3D · THREE.JS',   href: '/anttra/globe',     accent: '#5599ff', live: true,  imgSrc: '/globe.png' },
  { label: 'FACE MESH',           sub: 'ML · VISION',     href: '/anttra/facemesh',  accent: '#cc44ff', live: true,  imgSrc: '/facemesh.png' },
  { label: 'VOID',                sub: 'EXPERIMENT',      href: '/anttra/void',      accent: '#ff0055', live: false, cssBg: 'linear-gradient(160deg, #120e06 0%, #1e1508 100%)' },
  { label: 'MASTER THESIS',       sub: 'RESEARCH',        href: '/anttra/master',    accent: '#e08030', live: false, cssBg: 'linear-gradient(160deg, #120e06 0%, #1e1508 100%)' },
  { label: 'LANDMARK CTRL',       sub: 'HAND TRACKING',   href: '/anttra/landmark',  accent: '#30e080', live: false, cssBg: 'radial-gradient(ellipse at 70% 30%, #041a0e 0%, #040404 70%)' },
];

const TICKER = 'ANTTRA  ·  TOO BAD  ·  DONT READ THIS  ·  FAKE NEWS  ·';

// ─── page ─────────────────────────────────────────────────────────────────────

const MIN_LOADING_MS = 800; // minimum time to show loading screen

export default function AnttraPage() {
  const glowRef       = useRef<HTMLDivElement>(null);
  const tickerRef     = useRef<HTMLDivElement>(null);
  const loadingRef    = useRef<HTMLDivElement>(null);
  const horizRef      = useRef<HTMLElement>(null);
  const trackRef      = useRef<HTMLDivElement>(null);
  const heroTlRef     = useRef<gsap.core.Timeline | null>(null);
  const loadStartRef  = useRef(Date.now());
  const [sceneReady, setSceneReady] = useState(false);

  const handleSceneReady = useCallback(() => {
    const elapsed   = Date.now() - loadStartRef.current;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(() => {
      gsap.to(loadingRef.current, {
        opacity: 0, duration: 0.7, ease: 'power2.inOut',
        onComplete: () => {
          if (loadingRef.current) loadingRef.current.style.display = 'none';
          setSceneReady(true);
          heroTlRef.current?.play();
        },
      });
    }, remaining);
  }, []);

  // quickTo: single tween updated in-place — no new tween per mousemove
  useEffect(() => {
    if (!glowRef.current) return;
    const xTo = gsap.quickTo(glowRef.current, 'x', { duration: 1.8, ease: 'power2.out' });
    const yTo = gsap.quickTo(glowRef.current, 'y', { duration: 1.8, ease: 'power2.out' });
    const onMove = (e: MouseEvent) => {
      xTo(e.clientX - window.innerWidth  / 2);
      yTo(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.main-title', { willChange: 'transform' });

      // ── hero entrance — paused until loading screen exits ──
      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true });
      heroTl
        .from('.nav-bar',          { opacity: 0, y: -18, duration: 0.8 })
        .from('.main-title',       { opacity: 0, y: 80, filter: 'blur(28px)', duration: 2.4, ease: 'expo.out' }, '-=0.4')
        .set ('.main-title',       { clearProps: 'filter' })
        .to  ('.main-title',       { x: 5, duration: 0.04, yoyo: true, repeat: 5, ease: 'none' }, '-=1.8')
        .from('.hero-line',        { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out' }, '-=1.6')
        .from('.hero-meta > span', { opacity: 0, y: 10, stagger: 0.1, duration: 0.7 }, '-=1.1')
        .from('.scroll-hint',      { opacity: 0, y: 8, duration: 0.8 }, '-=0.4');
      heroTlRef.current = heroTl;

      // ── hero parallax ──
      gsap.to('.main-title', {
        yPercent: -22, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.5 },
      });
      gsap.to('.scroll-hint', {
        opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: '+=180', scrub: 1 },
      });

      // ── ticker ──
      const ticker = tickerRef.current;
      if (ticker) {
        gsap.to(ticker, { x: -ticker.offsetWidth / 2, duration: 28, ease: 'none', repeat: -1 });
      }

      // ── horizontal showcase ──
      const track   = trackRef.current;
      const section = horizRef.current;
      if (track && section) {
        gsap.set(track, { willChange: 'transform' });
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            invalidateOnRefresh: true,
          },
        });
      }

      gsap.from('.status-bar', {
        opacity: 0, duration: 1,
        scrollTrigger: { trigger: '.status-bar', start: 'top 95%', once: true },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
    {/* ── loading screen ── */}
    <div ref={loadingRef} className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#040404]"
      style={{ willChange: 'opacity' }}>
      <p className="font-mono text-[clamp(2rem,8vw,5rem)] tracking-[0.25em] text-[#d0d0d0] opacity-70 select-none">
        anttra
      </p>
      <div className="mt-8 w-32 h-px bg-white/10 relative overflow-hidden">
        <div style={{ animation: 'loadSlide 1.1s ease-in-out infinite alternate',
          position: 'absolute', inset: 0, width: '33%', background: 'rgba(255,255,255,0.45)' }} />
      </div>
      <style>{`@keyframes loadSlide{from{transform:translateX(-100%)}to{transform:translateX(400%)}}`}</style>
    </div>

    <div className="bg-[#040404] text-[#d0d0d0] selection:bg-white selection:text-black">

      {/* ── single fixed overlay: noise + scanlines + vignette (1 compositor layer) ── */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        backgroundImage: [
          `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
          'radial-gradient(ellipse at 50% 55%, transparent 30%, rgba(0,0,0,0.7) 100%)',
        ].join(','),
        backgroundSize: '200px 200px, auto, auto',
      }} />

      {/* cursor glow — own layer for GPU animation */}
      <div ref={glowRef} className="fixed pointer-events-none z-0"
        style={{ top: '50%', left: '50%', width: 700, height: 700, marginLeft: -350, marginTop: -350,
          background: 'radial-gradient(circle, rgba(160,80,255,0.055) 0%, transparent 68%)', borderRadius: '50%' }} />

      {/* ── hero ── */}
      <section className="hero-section relative flex flex-col min-h-screen px-8 md:px-16">
        {/* Three.js background */}
        <div className="absolute inset-0 z-0">
          <HeroScene onReady={handleSceneReady} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.2) 0%, transparent 35%, rgba(4,4,4,0.65) 100%)' }} />
        </div>
        <div className="nav-bar relative z-10 flex items-center justify-between pt-8 pb-0">
          <Link href="/" className="font-mono text-[10px] tracking-[0.3em] opacity-35 hover:opacity-100 transition-opacity uppercase">
            ← return
          </Link>
          <span className="font-mono text-[10px] tracking-[0.22em] opacity-20 uppercase">Trondheim · NO</span>
        </div>

        <div className="flex-1 relative z-10 flex flex-col justify-center py-16">
          <h1 className="main-title font-mono font-light leading-[0.85] tracking-[-0.03em] text-[#d8d8d8]"
            style={{ fontSize: 'clamp(4rem, 17vw, 13rem)', willChange: 'transform' }}>
            anttra
          </h1>
          <div className="mt-5 mb-4">
            <div className="hero-line h-px bg-white/10 max-w-4xl" />
          </div>
          <div className="hero-meta flex flex-wrap items-center gap-4 font-mono text-[10px] tracking-[0.22em] uppercase">
            <span className="opacity-40">Cybernetics</span>
            <span className="opacity-20">·</span>
            <span className="opacity-40">Robotics</span>
            <span className="opacity-20">·</span>
            <span className="opacity-40">Geology</span>
          </div>
        </div>

        <div className="scroll-hint relative z-10 pb-10 flex items-center gap-3 font-mono text-[9px] tracking-[0.3em] uppercase opacity-25">
          <span>scroll</span>
          <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
            <path d="M0 5h18M14 1l4 4-4 4" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </div>
      </section>

      {/* ── ticker ── */}
      <div className="relative z-20 overflow-hidden py-4" style={{ borderTop: '1px solid rgba(208,208,208,0.06)', borderBottom: '1px solid rgba(208,208,208,0.06)' }}>
        <div ref={tickerRef} className="whitespace-nowrap inline-block font-mono text-[10px] tracking-[0.28em] uppercase opacity-22 select-none">
          {(TICKER.repeat(10) + TICKER.repeat(10))}
        </div>
      </div>

      {/* ── horizontal showcase ── */}
      <section ref={horizRef} className="relative z-20 overflow-hidden" style={{ height: '100vh' }}>
        <div className="absolute left-8 md:left-16 top-8 z-10">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-30">showcase</span>
        </div>
        <div ref={trackRef} className="flex items-center h-full gap-[2vw]"
          style={{ paddingLeft: '8vw', paddingRight: '8vw', width: 'fit-content', willChange: 'transform' }}>
          {showcase.map((item, i) => (
            <ShowcaseCard key={i} item={item} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* ── status bar ── */}
      <div className="status-bar relative z-20 flex items-center justify-between px-8 md:px-16 py-5"
        style={{ borderTop: '1px solid rgba(208,208,208,0.06)' }}>
        <span className="font-mono text-[9px] tracking-[0.28em] uppercase opacity-18">
          {new Date().getFullYear()} · systems nominal
        </span>
        <Link href="/anttra/void"
          className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-15 hover:opacity-75 hover:tracking-[0.38em] transition-all duration-700">
          void_segment →
        </Link>
      </div>
    </div>
    </>
  );
}

// ─── showcase card ────────────────────────────────────────────────────────────

function ShowcaseCard({ item, priority }: { item: ShowcaseItem; priority?: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        width: 'min(70vw, 660px)',
        height: 'min(78vh, 640px)',
        borderRadius: 2,
        scrollSnapAlign: 'center',
        outline: hovered ? `1px solid ${item.accent}55` : '1px solid rgba(208,208,208,0.08)',
        transition: 'outline 0.3s',
      }}
    >
      {/* background */}
      {item.imgSrc ? (
        <Image src={item.imgSrc} alt={item.label} fill sizes="(max-width: 768px) 80vw, 55vw"
          priority={priority}
          className="card-img object-cover transition-transform duration-700"
          style={{ transform: hovered ? 'scale(1.05)' : 'scale(1.12)' }}
        />
      ) : (
        <div className="card-img absolute inset-0" style={{ background: item.cssBg }} />
      )}

      {/* gradient overlay */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.05) 100%)' }} />

      {/* content */}
      <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-10">
        <div className="flex justify-end">
          <span className="font-mono text-[9px] tracking-[0.28em] uppercase"
            style={{ color: item.accent, opacity: 0.65 }}>
            {item.sub}
          </span>
        </div>
        <div className="card-label">
          <div className="h-px mb-4" style={{ background: item.accent + '55', width: 40 }} />
          <h2 className="font-mono font-light tracking-tight"
            style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', color: '#f0f0f0', lineHeight: 0.9 }}>
            {item.label}
          </h2>
          <span className="block font-mono text-[10px] tracking-[0.2em] uppercase mt-3"
            style={{ color: item.live ? item.accent : 'rgba(208,208,208,0.3)', opacity: hovered ? 0.85 : 0, transition: 'opacity 0.3s' }}>
            {item.live ? 'view project →' : 'wip'}
          </span>
        </div>
      </div>

      {item.live && <Link href={item.href} className="absolute inset-0" />}
    </div>
  );
}

