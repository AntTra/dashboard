'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

type ShowcaseItem = {
  label: string; sub: string; href: string; accent: string; live: boolean;
  imgSrc?: string; cssBg?: string;
};

const showcase: ShowcaseItem[] = [
  { label: 'CV',                  sub: 'BIOGRAPHY',            href: '/anttra/cv',        accent: '#d0c090', live: true,  cssBg: 'linear-gradient(135deg, #0c0c10 0%, #181820 100%)' },
  { label: 'BUSROUTES',           sub: 'REAL-TIME TRANSIT MAP', href: '/anttra/busroutes', accent: '#4488ff', live: true,  imgSrc: '/busroutes.png' },
  { label: 'VERTEX GLOBES',       sub: '3D · THREE.JS',        href: '/anttra/globe',     accent: '#5599ff', live: true,  imgSrc: '/globe.png' },
  { label: 'FACE MESH',           sub: 'ML · VISION',          href: '/anttra/facemesh',  accent: '#cc44ff', live: true,  imgSrc: '/facemesh.png' },
  { label: 'VOID',                sub: 'EXPERIMENT',           href: '/anttra/void',      accent: '#ff0055', live: false, cssBg: 'linear-gradient(160deg, #120e06 0%, #1e1508 100%)' },
  { label: 'MASTER THESIS',       sub: 'RESEARCH',             href: '/anttra/master',    accent: '#e08030', live: false, cssBg: 'linear-gradient(160deg, #120e06 0%, #1e1508 100%)' },
  { label: 'LANDMARK CTRL',       sub: 'HAND TRACKING',        href: '/anttra/landmark',  accent: '#66aaff', live: false, cssBg: 'radial-gradient(ellipse at 70% 30%, #040e1a 0%, #040404 70%)' },
];

const TICKER = 'ANTTRA  ·  TOO BAD  ·  DONT READ THIS  ·  FAKE NEWS  ·';
const BG = '#1c1c20';
const MIN_LOADING_MS = 800;

export default function AnttraPage() {
  const glowRef      = useRef<HTMLDivElement>(null);
  const tickerRef    = useRef<HTMLDivElement>(null);
  const loadingRef   = useRef<HTMLDivElement>(null);
  const horizRef     = useRef<HTMLElement>(null);
  const trackRef     = useRef<HTMLDivElement>(null);
  const bannerRef    = useRef<HTMLDivElement>(null);
  const progressRef  = useRef<HTMLDivElement>(null);
  const heroTlRef    = useRef<gsap.core.Timeline | null>(null);
  const loadStartRef = useRef(Date.now());
  const [sceneReady, setSceneReady] = useState(false);

  const handleSceneReady = useCallback(() => {
    const elapsed   = Date.now() - loadStartRef.current;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    setTimeout(() => {
      gsap.to(loadingRef.current, {
        opacity: 0, duration: 0.7, ease: 'power2.inOut',
        onComplete: () => {
          if (loadingRef.current) loadingRef.current.style.display = 'none';
          document.body.style.overflow = '';
          setSceneReady(true);
          heroTlRef.current?.play();
        },
      });
    }, remaining);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

      gsap.to('.main-title', {
        yPercent: -22, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.5 },
      });
      gsap.to('.scroll-hint', {
        opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: '+=180', scrub: 1 },
      });

      const ticker = tickerRef.current;
      if (ticker) {
        gsap.to(ticker, { x: -ticker.offsetWidth / 2, duration: 28, ease: 'none', repeat: -1 });
      }

      const track   = trackRef.current;
      const section = horizRef.current;
      if (track && section) {
        gsap.set(track, { willChange: 'transform' });

        // morph cards in as showcase section approaches
        const cards = track.querySelectorAll('.showcase-card');
        if (cards.length) {
          gsap.from(cards, {
            y: 55, scale: 0.92,
            duration: 1.0, stagger: 0.09, ease: 'expo.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          });
        }

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

      // banner: fade in as hero scrolls out
      gsap.to(bannerRef.current, {
        opacity: 1, ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'bottom 75%',
          end: 'bottom 45%',
          scrub: true,
        },
      });

      // progress bar: fills across the full showcase horizontal scroll
      if (trackRef.current && horizRef.current) {
        gsap.to(progressRef.current, {
          scaleX: 1, ease: 'none',
          scrollTrigger: {
            trigger: horizRef.current,
            start: 'top top',
            end: () => `+=${trackRef.current!.scrollWidth - window.innerWidth}`,
            scrub: true,
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
    <div ref={loadingRef} className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: BG, willChange: 'opacity' }}>
      <p className="font-mono text-[clamp(2rem,8vw,5rem)] tracking-[0.25em] text-[#d0d0d0] opacity-70 select-none">
        anttra
      </p>
      <div className="mt-8 w-32 h-px bg-white/10 relative overflow-hidden">
        <div style={{ animation: 'loadSlide 1.1s ease-in-out infinite alternate',
          position: 'absolute', inset: 0, width: '33%', background: 'rgba(255,255,255,0.45)' }} />
      </div>
      <style>{`@keyframes loadSlide{from{transform:translateX(-100%)}to{transform:translateX(400%)}}`}</style>
    </div>

    <div style={{ background: BG }} className="text-[#d0d0d0] selection:bg-white selection:text-black">

      {/* film grain + scanlines + vignette */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        backgroundImage: [
          `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
          'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(0,0,0,0.4) 100%)',
        ].join(','),
        backgroundSize: '200px 200px, auto, auto',
      }} />

      {/* cursor glow */}
      <div ref={glowRef} className="fixed pointer-events-none z-0"
        style={{ top: '50%', left: '50%', width: 700, height: 700, marginLeft: -350, marginTop: -350,
          background: 'radial-gradient(circle, rgba(160,80,255,0.07) 0%, transparent 68%)', borderRadius: '50%' }} />

      {/* fixed banner */}
      <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-30 pointer-events-none" style={{ opacity: 0 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(28,28,32,0.85) 0%, transparent 100%)' }} />
        <div className="relative flex items-center justify-between px-8 md:px-16 py-4">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-35">anttra</span>
          <div className="w-24 h-px bg-white/12 overflow-hidden">
            <div ref={progressRef} className="h-full w-full bg-white/45 origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>
        </div>
      </div>

      {/* global ambient gradient blobs */}
      <div className="fixed pointer-events-none z-0 inset-0" style={{
        background: [
          'radial-gradient(ellipse at 88% 8%,  rgba(0,33,71,0.18)    0%, transparent 52%)',
          'radial-gradient(ellipse at 10% 92%, rgba(255,140,50,0.03)  0%, transparent 48%)',
          'radial-gradient(ellipse at 50% 50%, rgba(80,40,160,0.025)  0%, transparent 60%)',
        ].join(','),
      }} />

      {/* ── HERO ── */}
      <section className="hero-section relative flex flex-col min-h-screen px-8 md:px-16">
        <div className="absolute inset-0 z-0">
          <HeroScene onReady={handleSceneReady} />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, rgba(28,28,32,0.1) 0%, transparent 40%, rgba(28,28,32,0.35) 100%)` }} />
        </div>
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(0,33,71,0.28) 0%, transparent 50%)' }} />

        <div className="nav-bar relative z-10 flex items-center pt-8 pb-0">
          <Link href="/" className="font-mono text-[10px] tracking-[0.3em] opacity-35 hover:opacity-100 transition-opacity uppercase">
            ← return
          </Link>
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

      {/* ── TICKER ── */}
      <div className="relative z-20 overflow-hidden py-4"
        style={{ borderTop: '1px solid rgba(208,208,208,0.07)', borderBottom: '1px solid rgba(208,208,208,0.07)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,33,71,0.18) 50%, transparent 100%)' }} />
        <div ref={tickerRef} className="whitespace-nowrap inline-block font-mono text-[10px] tracking-[0.28em] uppercase opacity-22 select-none">
          {(TICKER.repeat(10) + TICKER.repeat(10))}
        </div>
      </div>

      {/* ── SHOWCASE ── */}
      <section ref={horizRef} className="relative z-20 overflow-hidden" style={{ height: '100vh' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(40,60,200,0.07) 0%, transparent 65%)' }} />
        <div className="absolute left-8 md:left-16 top-8 z-10 flex items-center gap-3">
          <div className="h-px w-6 bg-white/30" />
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-white/55">showcase</span>
        </div>
        <div ref={trackRef} className="flex items-center h-full gap-[2vw]"
          style={{ paddingLeft: '8vw', paddingRight: '8vw', width: 'fit-content', willChange: 'transform' }}>
          {showcase.map((item, i) => (
            <ShowcaseCard key={i} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* ── STATUS BAR ── */}
      <div className="status-bar relative z-20 flex items-center justify-between px-8 md:px-16 py-5"
        style={{ borderTop: '1px solid rgba(208,208,208,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(255,150,50,0.04) 0%, transparent 60%)' }} />
        <span className="relative font-mono text-[9px] tracking-[0.28em] uppercase opacity-30">
          {new Date().getFullYear()}
        </span>
        <Link href="/anttra/void"
          className="relative font-mono text-[9px] tracking-[0.2em] uppercase opacity-20 hover:opacity-80 hover:tracking-[0.38em] transition-all duration-700">
          void_segment →
        </Link>
      </div>
    </div>
    </>
  );
}


function ShowcaseCard({ item, index }: { item: ShowcaseItem; index: number }) {
  const [hovered, setHovered] = useState(false);
  const num = String(index + 1).padStart(2, '0');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="showcase-card relative flex-shrink-0 overflow-hidden"
      style={{
        width: 'min(70vw, 660px)',
        height: 'min(78vh, 640px)',
        borderRadius: 2,
        background: '#080808',
        scrollSnapAlign: 'center',
        outline: hovered ? `1px solid ${item.accent}88` : '1px solid rgba(208,208,208,0.1)',
        transition: 'outline 0.3s, box-shadow 0.4s',
        boxShadow: hovered ? `0 0 40px ${item.accent}1a` : 'none',
      }}
    >
      <div
        className="absolute inset-0 transition-transform duration-700"
        style={{
          background: item.imgSrc
            ? `url(${item.imgSrc}) center/cover no-repeat`
            : item.cssBg,
          transform: hovered ? 'scale(1.05)' : 'scale(1.12)',
        }}
      />

      {/* gradient overlay */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.18) 42%, rgba(0,0,0,0.04) 100%)' }} />

      {/* accent top border */}
      <div className="absolute top-0 left-0 right-0 h-px transition-opacity duration-300"
        style={{ background: item.accent, opacity: hovered ? 0.8 : 0.25 }} />

      {/* content */}
      <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-10">
        <div className="flex items-start justify-between">
          <span className="font-mono text-[11px] tracking-[0.2em]"
            style={{ color: item.accent, opacity: 0.35 }}>
            {num}
          </span>
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: item.accent, opacity: 0.85 }}>
            {item.sub}
          </span>
        </div>
        <div className="card-label">
          <div className="h-px mb-5"
            style={{ background: `linear-gradient(90deg, ${item.accent}99, transparent)`, width: 56 }} />
          <h2 className="font-mono font-light tracking-tight"
            style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', color: '#f4f4f4', lineHeight: 0.9 }}>
            {item.label}
          </h2>
          <span className="block font-mono text-[10px] tracking-[0.22em] uppercase mt-4 transition-all duration-300"
            style={{ color: item.live ? item.accent : 'rgba(208,208,208,0.25)', opacity: item.live ? (hovered ? 1 : 0.45) : 0.3 }}>
            {item.live ? 'view project →' : 'wip'}
          </span>
        </div>
      </div>

      {item.live && <Link href={item.href} className="absolute inset-0" />}
    </div>
  );
}
