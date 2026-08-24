'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import West from '@mui/icons-material/West';
import ArrowOutward from '@mui/icons-material/ArrowOutward';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, ScrollToPlugin);

const SNAP_COOLDOWN_MS = 500;

// swap for next/font Instrument_Serif if you want the real face:
// const serif = Instrument_Serif({ weight: '400', style: 'italic', subsets: ['latin'] });
const SERIF_STACK = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

type ShowcaseItem = {
  label: string; sub: string; href: string; accent: string; live: boolean;
  imgSrc?: string; cssBg?: string;
};

const showcase: ShowcaseItem[] = [
  { label: 'CV',            sub: 'BIOGRAPHY',             href: '/anttra/cv',        accent: '#d0c090', live: true,  cssBg: 'linear-gradient(135deg, #0c0c10 0%, #181820 100%)' },
  { label: 'BUSROUTES',     sub: 'REAL-TIME TRANSIT MAP', href: '/anttra/busroutes', accent: '#4488ff', live: true,  imgSrc: '/busroutes.png' },
  { label: 'VERTEX GLOBES', sub: '3D · THREE.JS',         href: '/anttra/globe',     accent: '#5599ff', live: true,  imgSrc: '/globe.png' },
  { label: 'FACE MESH',     sub: 'ML · VISION',           href: '/anttra/facemesh',  accent: '#cc44ff', live: true,  imgSrc: '/facemesh.png' },
  { label: 'MASTER THESIS', sub: 'RL-MPC · AUTONOMY',     href: '/anttra/master',    accent: '#e08030', live: false, cssBg: 'linear-gradient(160deg, #120e06 0%, #1e1508 100%)' },
  { label: 'LANDMARK CTRL', sub: 'HAND TRACKING',         href: '/anttra/landmark',  accent: '#66aaff', live: false, cssBg: 'radial-gradient(ellipse at 70% 30%, #040e1a 0%, #040404 70%)' },
];

const TICKER = 'ANTTRA  ·  TOO BAD  ·  DONT READ THIS  ·  FAKE NEWS  ·';
const BG = '#0b0f16';
const MIN_LOADING_MS = 800;

/* narrative beats — big statement + serif emphasis + mono footnote */
const acts = [
  {
    pre: 'Every sixty seconds, a ship admits where it ',
    em: 'thinks',
    post: ' it is.',
    note: 'AIS · irregular, gapped, occasionally absurd',
  },
  {
    pre: 'Between two pings lies open water — every path is a ',
    em: 'guess',
    post: '.',
    note: 'constant-velocity prior · huber loss · χ² gates',
  },
  {
    pre: 'Estimation is refusing to fully trust the sensor ',
    em: 'or',
    post: ' the model.',
    note: 'factor graphs · smoothing · sparse normal equations',
  },
];

export default function AnttraPage() {
  const tickerRef    = useRef<HTMLDivElement>(null);
  const loadingRef   = useRef<HTMLDivElement>(null);
  const horizRef     = useRef<HTMLElement>(null);
  const trackRef     = useRef<HTMLDivElement>(null);
  const bannerRef    = useRef<HTMLDivElement>(null);
  const progressRef  = useRef<HTMLDivElement>(null);
  const storyRef     = useRef<HTMLElement>(null);
  const heroTlRef    = useRef<gsap.core.Timeline | null>(null);
  const storyStRef     = useRef<ScrollTrigger | null>(null);
  const storyTlRef     = useRef<gsap.core.Timeline | null>(null);
  const showcaseStRef  = useRef<ScrollTrigger | null>(null);
  const loadStartRef = useRef(Date.now());
  const [, setSceneReady] = useState(false);

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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      gsap.set('.main-title', { willChange: 'transform' });

      /* ── hero entrance ── */
      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: true });
      heroTl
        .from('.nav-bar',          { opacity: 0, y: -18, duration: 0.8 })
        .from('.main-title',       { opacity: 0, y: 80, filter: 'blur(28px)', duration: 2.4, ease: 'expo.out' }, '-=0.4')
        .set ('.main-title',       { clearProps: 'filter' })
        .from('.hero-line',        { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out' }, '-=1.6')
        .from('.hero-meta > span', { opacity: 0, y: 10, stagger: 0.1, duration: 0.7 }, '-=1.1')
        .from('.hero-legend > *',  { opacity: 0, x: -8, stagger: 0.12, duration: 0.8 }, '-=0.9')
        .from('.scroll-hint',      { opacity: 0, y: 8, duration: 0.8 }, '-=0.4');
      heroTlRef.current = heroTl;
      if (reduced) { heroTl.progress(1); }

      gsap.to('.main-title', {
        yPercent: -22, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.5 },
      });
      gsap.to('.scroll-hint', {
        opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: '+=180', scrub: 1 },
      });

      /* ── narrative act: pinned, statements crossfade on scrub ── */
      const story = storyRef.current;
      if (story) {
        const beats = gsap.utils.toArray<HTMLElement>('.act-beat');
        const storyTl = gsap.timeline({
          scrollTrigger: {
            trigger: story, pin: true, scrub: 0.8,
            start: 'top top', end: '+=280%',
          },
        });
        beats.forEach((beat, i) => {
          storyTl.fromTo(beat,
            { opacity: 0, y: 60, filter: 'blur(14px)' },
            { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out' }, i * 2.2);
          if (i < beats.length - 1) {
            storyTl.to(beat,
              { opacity: 0, y: -60, filter: 'blur(14px)', duration: 1, ease: 'power2.in' }, i * 2.2 + 1.5);
          }
        });
        // last beat stays; telemetry row slides under it
        storyTl.from('.act-telemetry > span', {
          opacity: 0, y: 12, stagger: 0.15, duration: 0.6,
        }, (beats.length - 1) * 2.2 + 0.9);

        storyStRef.current = storyTl.scrollTrigger ?? null;
        storyTlRef.current = storyTl;
      }

      /* ── ticker ── */
      const ticker = tickerRef.current;
      if (ticker && !reduced) {
        gsap.to(ticker, { x: -ticker.offsetWidth / 2, duration: 28, ease: 'none', repeat: -1 });
      }

      /* ── showcase horizontal scroll ── */
      const track   = trackRef.current;
      const section = horizRef.current;
      if (track && section) {
        gsap.set(track, { willChange: 'transform' });

        const cards = track.querySelectorAll('.showcase-card');
        if (cards.length) {
          gsap.from(cards, {
            y: 55, scale: 0.92,
            duration: 1.0, stagger: 0.09, ease: 'expo.out',
            scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none none' },
          });
        }

        const showcaseTween = gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: section, pin: true, scrub: 1,
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            invalidateOnRefresh: true,
          },
        });
        showcaseStRef.current = showcaseTween.scrollTrigger ?? null;
      }

      /* ── thesis reveals + line-draw ── */
      gsap.utils.toArray<HTMLElement>('.thesis-reveal').forEach((el) => {
        gsap.from(el, {
          opacity: 0, y: 40, duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>('.thesis-row').forEach((row) => {
        const paths = Array.from(row.querySelectorAll<SVGGeometryElement>('.draw'));
        const pops  = row.querySelectorAll('.pop');
        const dots  = Array.from(row.querySelectorAll<SVGCircleElement>('.mp-dot'));

        const lenOf = (el: SVGGeometryElement) => {
          try { return el.getTotalLength(); } catch { return 200; }
        };

        /* restore native dash pattern (or solid) once drawn; start marching ambience */
        const finishEl = (el: SVGGeometryElement) => {
          gsap.set(el, { clearProps: 'strokeDasharray,strokeDashoffset' });
          const march = el.dataset.march;
          if (march && !reduced) {
            gsap.to(el, { strokeDashoffset: `+=${march}`, duration: 1.4, ease: 'none', repeat: -1 });
          }
        };

        const startDot = (dot: SVGCircleElement) => {
          const sel = dot.dataset.path;
          if (!sel) return;
          const dur  = Number(dot.dataset.dur ?? 6);
          const fade = Math.min(1, dur * 0.1);
          const dtl  = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
          dtl.to(dot, { motionPath: { path: sel, align: sel, alignOrigin: [0.5, 0.5] }, duration: dur, ease: 'none' }, 0)
             .fromTo(dot, { opacity: 0 }, { opacity: 0.9, duration: fade, ease: 'power1.in' }, 0)
             .to(dot, { opacity: 0, duration: fade, ease: 'power1.out' }, dur - fade);
        };

        if (reduced) { paths.forEach(finishEl); return; }

        const tl = gsap.timeline({
          scrollTrigger: { trigger: row, start: 'top 75%', once: true },
          defaults: { ease: 'sine.inOut' },
          onComplete: () => {
            dots.forEach(startDot);
            const fan = row.querySelectorAll('.fan-c');
            if (fan.length) {
              gsap.to(fan, { opacity: 0.45, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.45 });
            }
          },
        });

        /* per-stroke durations scaled by real length; overlapped starts */
        let pos = 0;
        paths.forEach((el) => {
          const L = lenOf(el);
          gsap.set(el, { strokeDasharray: L, strokeDashoffset: L });
          const d = gsap.utils.clamp(0.5, 2.4, L / 260);
          tl.to(el, { strokeDashoffset: 0, duration: d, onComplete: () => finishEl(el) }, pos);
          pos += d * 0.35;
        });
        tl.from(pops, {
          opacity: 0, y: 4, duration: 0.6, stagger: 0.06, ease: 'power2.out',
        }, Math.max(0.3, pos * 0.65));
      });

      /* ── outro ── */
      gsap.from('.outro-line', {
        opacity: 0, y: 50, stagger: 0.15, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: '.outro-section', start: 'top 70%', once: true },
      });
      gsap.from('.outro-links > *', {
        opacity: 0, y: 14, stagger: 0.1, duration: 0.8,
        scrollTrigger: { trigger: '.outro-section', start: 'top 55%', once: true },
      });

      /* ── fixed banner + progress ── */
      gsap.to(bannerRef.current, {
        opacity: 1, ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'bottom 75%', end: 'bottom 45%', scrub: true },
      });
      /* whole-document scroll progress (pinned sections inflate body height,
         so top→bottom already accounts for the showcase's horizontal run) */
      gsap.fromTo(progressRef.current,
        { scaleX: 0 },
        {
          scaleX: 1, ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top', end: 'bottom bottom',
            scrub: 0.3, invalidateOnRefresh: true,
          },
        });
    });

    /* ── per-slide snap scrolling ──
       One wheel gesture = one "slide": the hero, each narrative beat, each
       thesis row, each showcase card, and the outro. Stops are absolute
       document scroll positions, recomputed only on ScrollTrigger.refresh
       (never mid-gesture) — the story/showcase elements are pinned or
       transformed by GSAP, so reading their live getBoundingClientRect()
       while scrolled gives a moving target. */
    let snapping = false;
    let unlockTimer: ReturnType<typeof setTimeout> | null = null;
    let snapStops: number[] = [];

    const recomputeSnapStops = () => {
      const stops: number[] = [0];

      const storySt = storyStRef.current;
      const storyTl = storyTlRef.current;
      if (storySt && storyTl) {
        const dur = storyTl.duration();
        const beatCount = acts.length;
        for (let i = 0; i < beatCount; i++) {
          const t = Math.min(dur, i * 2.2 + 1);
          stops.push(storySt.start + (storySt.end - storySt.start) * (t / dur));
        }
      }

      document.querySelectorAll<HTMLElement>('.thesis-row').forEach((row) => {
        stops.push(row.getBoundingClientRect().top + window.scrollY);
      });

      const showcaseSt = showcaseStRef.current;
      const track = trackRef.current;
      if (showcaseSt && track) {
        const cards = Array.from(track.querySelectorAll<HTMLElement>('.showcase-card'));
        const maxX = track.scrollWidth - window.innerWidth;
        cards.forEach((card) => {
          const centerX = card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
          const x = Math.min(Math.max(centerX, 0), maxX);
          stops.push(showcaseSt.start + x);
        });
      }

      const outro = document.querySelector<HTMLElement>('.outro-section');
      if (outro) {
        const top = outro.getBoundingClientRect().top + window.scrollY;
        stops.push(Math.min(top, document.documentElement.scrollHeight - window.innerHeight));
      }

      snapStops = Array.from(new Set(stops)).sort((a, b) => a - b);
    };

    recomputeSnapStops();
    ScrollTrigger.addEventListener('refresh', recomputeSnapStops);
    /* ScrollTrigger debounces its own resize handling, but drive it
       explicitly too so a resolution/orientation change always lands a
       refresh (and thus a snapStops recompute) rather than depending on
       internals we don't control. */
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    window.addEventListener('resize', onResize);

    const onWheel = (e: WheelEvent) => {
      if (snapping) {
        e.preventDefault();
        if (unlockTimer) clearTimeout(unlockTimer);
        unlockTimer = setTimeout(() => { snapping = false; }, SNAP_COOLDOWN_MS);
        return;
      }

      const dir = e.deltaY > 0 ? 1 : -1;
      const y = window.scrollY;
      const EPS = 4;
      const target = dir > 0
        ? snapStops.find(s => s > y + EPS)
        : [...snapStops].reverse().find(s => s < y - EPS);
      if (target === undefined) return;

      e.preventDefault();
      snapping = true;
      gsap.to(window, {
        scrollTo: { y: target, autoKill: false },
        duration: reduced ? 0 : 0.7, ease: 'power2.inOut', overwrite: true,
        onComplete: () => { unlockTimer = setTimeout(() => { snapping = false; }, SNAP_COOLDOWN_MS); },
      });
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      ctx.revert();
      ScrollTrigger.removeEventListener('refresh', recomputeSnapStops);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      if (unlockTimer) clearTimeout(unlockTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
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

    <div style={{ background: BG }} className="text-[#cfd6de] selection:bg-white selection:text-black">

      {/* film grain + scanlines + vignette */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{
        backgroundImage: [
          `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
          'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(0,0,0,0.45) 100%)',
        ].join(','),
        backgroundSize: '200px 200px, auto, auto',
      }} />

      {/* fixed banner */}
      <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-30 pointer-events-none" style={{ opacity: 0 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,15,22,0.85) 0%, transparent 100%)' }} />
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
          'radial-gradient(ellipse at 88% 8%,  rgba(20,70,110,0.16)  0%, transparent 52%)',
          'radial-gradient(ellipse at 10% 92%, rgba(224,128,48,0.03) 0%, transparent 48%)',
          'radial-gradient(ellipse at 50% 50%, rgba(30,80,80,0.03)   0%, transparent 60%)',
        ].join(','),
      }} />

      {/* ── HERO ── */}
      <section className="hero-section relative flex flex-col min-h-screen px-8 md:px-16">
        <div className="absolute inset-0 z-0">
          <HeroScene onReady={handleSceneReady} />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, rgba(11,15,22,0.15) 0%, transparent 35%, rgba(11,15,22,0.5) 100%)` }} />
        </div>

        <div className="nav-bar relative z-10 flex items-center justify-between pt-8 pb-0">
          <Link href="/" className="font-mono text-[10px] tracking-[0.3em] opacity-35 hover:opacity-100 transition-opacity uppercase">
            <West sx={{ fontSize: 10 }} /> return
          </Link>
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-25">68°26′ N</span>
        </div>

        <div className="flex-1 relative z-10 flex flex-col justify-center py-16 pointer-events-none">
          <p className="hero-meta font-mono text-[10px] tracking-[0.32em] uppercase mb-5">
            <span className="opacity-45">state estimation · robotics · perception</span>
          </p>
          <h1 className="main-title font-mono font-light leading-[0.85] tracking-[-0.03em] text-[#dde3ea]"
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

        {/* legend: read the scene */}
        <div className="hero-legend absolute right-8 md:right-16 bottom-24 z-10 flex flex-col gap-2 font-mono text-[9px] tracking-[0.24em] uppercase pointer-events-none">
          <span className="flex items-center gap-3 opacity-45">
            <i className="inline-block w-2 h-2 rounded-full" style={{ background: '#f0a050' }} /> measurement
          </span>
          <span className="flex items-center gap-3 opacity-45">
            <i className="inline-block w-6 h-px" style={{ background: '#8fd4ff' }} /> estimate
          </span>
        </div>

        <div className="scroll-hint relative z-10 pb-10 flex items-center gap-3 font-mono text-[9px] tracking-[0.3em] uppercase opacity-25">
          <span>scroll</span>
          <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
            <path d="M0 5h18M14 1l4 4-4 4" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </div>
      </section>

      {/* ── NARRATIVE ACT ── */}
      <section ref={storyRef} className="relative z-20 h-screen overflow-hidden">
        <div className="absolute left-8 md:left-16 top-8 flex items-center gap-3">
          <div className="h-px w-6 bg-white/30" />
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-white/55">part i · sense</span>
        </div>

        <div className="relative h-full flex items-center px-8 md:px-24">
          {acts.map((a, i) => (
            <div key={i} className="act-beat absolute inset-x-8 md:inset-x-24 max-w-5xl"
              style={{ opacity: i === 0 ? undefined : 0 }}>
              <p className="text-[clamp(1.7rem,4.6vw,3.6rem)] font-light leading-[1.15] tracking-[-0.01em] text-[#e4e9ef]">
                {a.pre}
                <em style={{ fontFamily: SERIF_STACK, color: '#8fd4ff', fontStyle: 'italic' }}>{a.em}</em>
                {a.post}
              </p>
              <p className="mt-6 font-mono text-[10px] tracking-[0.3em] uppercase opacity-35">{a.note}</p>
            </div>
          ))}
        </div>

        <div className="act-telemetry absolute bottom-10 inset-x-8 md:inset-x-16 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[9px] tracking-[0.26em] uppercase">
          <span className="opacity-35">state · 6-dof</span>
          <span className="opacity-35">solver · sparse normal eq.</span>
          <span className="opacity-35">robustifier · huber / irls</span>
          <span className="opacity-35">gap tolerance · minutes, not seconds</span>
        </div>
      </section>

      {/* ── THESIS ── */}
      <section className="thesis-section relative z-20 px-8 md:px-16 py-28"
        style={{ borderTop: '1px solid rgba(208,214,222,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(224,128,48,0.045) 0%, transparent 55%)' }} />

        <style>{`
          .thesis-section svg .draw { stroke-linecap: round; }
          @keyframes illMarch  { to { stroke-dashoffset: -14; } }
          @keyframes illMarch8 { to { stroke-dashoffset: -16; } }
          @keyframes illFan    { 0%, 100% { opacity: 0.16; } 50% { opacity: 0.42; } }
          @keyframes illPulseX { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
          .march      { animation: illMarch 1.4s linear infinite; }
          .march-slow { animation: illMarch8 3.8s linear infinite; }
          .fan-c      { animation: illFan 3.4s ease-in-out infinite; }
          .pulse-x    { transform-box: fill-box; animation: illPulseX 2.6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .march, .march-slow, .fan-c, .pulse-x { animation: none; }
            .idle-dot { display: none; }
          }
        `}</style>

        <div className="thesis-reveal relative flex items-center gap-3 mb-14">
          <div className="h-px w-6 bg-white/30" />
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-white/55">part ii · act</span>
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/25">— m.sc. thesis</span>
        </div>

        <p className="thesis-reveal relative max-w-4xl font-light leading-[1.2] tracking-[-0.01em] text-[#e4e9ef]"
          style={{ fontSize: 'clamp(1.6rem, 3.8vw, 3rem)' }}>
          Knowing where you are is half the loop. The thesis is the other half —{' '}
          <em style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', color: '#f0a050' }}>acting</em> on it.
        </p>

        <div className="relative mt-24 flex flex-col gap-28">

          {/* row 1 — constrained crawl */}
          <div className="thesis-row grid md:grid-cols-2 gap-12 items-center">
            <div className="thesis-reveal">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-40 mb-5">01 · constrained motion</p>
              <h3 className="font-light leading-[1.15] text-[#e4e9ef]" style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)' }}>
                Crawl a curved, moving world at a{' '}
                <em style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', color: '#8fd4ff' }}>fixed</em> offset.
              </h3>
              <p className="mt-5 font-mono text-[10px] tracking-[0.28em] uppercase opacity-35">
                constrained nmpc · hull-relative frame · magnetic adhesion
              </p>
            </div>
            <IllCrawl />
          </div>

          {/* row 2 — rl-mpc loop */}
          <div className="thesis-row grid md:grid-cols-2 gap-12 items-center">
            <div className="md:order-last thesis-reveal">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-40 mb-5">02 · learning control</p>
              <h3 className="font-light leading-[1.15] text-[#e4e9ef]" style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)' }}>
                Let the controller predict. Let{' '}
                <em style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', color: '#f0a050' }}>experience</em> correct the prediction.
              </h3>
              <p className="mt-5 font-mono text-[10px] tracking-[0.28em] uppercase opacity-35">
                mpc as policy · rl over cost &amp; model parameters
              </p>
            </div>
            <IllLoop />
          </div>

          {/* row 3 — autonomous inspection */}
          <div className="thesis-row grid md:grid-cols-2 gap-12 items-center">
            <div className="thesis-reveal">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase opacity-40 mb-5">03 · agent-based autonomy</p>
              <h3 className="font-light leading-[1.15] text-[#e4e9ef]" style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)' }}>
                Plan the inspection.{' '}
                <em style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', color: '#8fd4ff' }}>Replan</em> around what shows up.
              </h3>
              <p className="mt-5 font-mono text-[10px] tracking-[0.28em] uppercase opacity-35">
                waypoint agents · obstacle-heavy 3d · recursive feasibility
              </p>
            </div>
            <IllPath />
          </div>
        </div>

        <div className="thesis-reveal relative mt-24 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[9px] tracking-[0.26em] uppercase">
          <span className="opacity-35">stack · nmpc / casadi</span>
          <span className="opacity-35">platform · varos hullskater</span>
          <span className="opacity-35">safety · constraints as first-class citizens</span>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="relative z-20 overflow-hidden py-4"
        style={{ borderTop: '1px solid rgba(208,214,222,0.07)', borderBottom: '1px solid rgba(208,214,222,0.07)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(20,60,100,0.18) 50%, transparent 100%)' }} />
        <div ref={tickerRef} className="whitespace-nowrap inline-block font-mono text-[10px] tracking-[0.28em] uppercase opacity-22 select-none">
          {(TICKER.repeat(10) + TICKER.repeat(10))}
        </div>
      </div>

      {/* ── SHOWCASE ── */}
      <section ref={horizRef} className="relative z-20 overflow-hidden" style={{ height: '100vh' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(30,70,160,0.07) 0%, transparent 65%)' }} />
        <div className="absolute left-8 md:left-16 top-8 z-10 flex items-center gap-3">
          <div className="h-px w-6 bg-white/30" />
          <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-white/55">selected work</span>
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/25">— {showcase.length} entries</span>
        </div>
        <div ref={trackRef} className="flex items-center h-full gap-[2vw]"
          style={{ paddingLeft: '8vw', paddingRight: '8vw', width: 'fit-content', willChange: 'transform' }}>
          {showcase.map((item, i) => (
            <ShowcaseCard key={i} item={item} index={i} total={showcase.length} />
          ))}
        </div>
      </section>

      {/* ── OUTRO ── */}
      <section className="outro-section relative z-20 min-h-[70vh] flex flex-col justify-center px-8 md:px-16 py-24"
        style={{ borderTop: '1px solid rgba(208,214,222,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(224,128,48,0.04) 0%, transparent 55%)' }} />
        <h2 className="relative font-light leading-[0.95] tracking-[-0.02em] text-[#e4e9ef]"
          style={{ fontSize: 'clamp(2.6rem, 8vw, 6.5rem)' }}>
          <span className="outro-line block">signal,</span>
          <span className="outro-line block" style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', color: '#8fd4ff' }}>from noise.</span>
        </h2>
        <div className="outro-links relative mt-14 flex flex-wrap items-center gap-8 font-mono text-[10px] tracking-[0.26em] uppercase">
          <a href="https://github.com/AntTra" target="_blank" rel="noreferrer"
            className="opacity-40 hover:opacity-100 hover:tracking-[0.4em] transition-all duration-500">
            github <ArrowOutward sx={{ fontSize: 9, verticalAlign: 'middle' }} />
          </a>
          <Link href="/anttra/cv"
            className="opacity-40 hover:opacity-100 hover:tracking-[0.4em] transition-all duration-500">
            cv <ArrowOutward sx={{ fontSize: 9, verticalAlign: 'middle' }} />
          </Link>
          <span className="opacity-20">© {new Date().getFullYear()} · narvik / trondheim, no</span>
        </div>
      </section>
    </div>
    </>
  );
}


function ShowcaseCard({ item, index, total }: { item: ShowcaseItem; index: number; total: number }) {
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
        outline: hovered ? `1px solid ${item.accent}88` : '1px solid rgba(208,214,222,0.1)',
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
          filter: hovered ? 'saturate(1)' : 'saturate(0.75)',
          transition: 'transform 0.7s, filter 0.7s',
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
            style={{ color: item.accent, opacity: 0.4 }}>
            {num} <span style={{ opacity: 0.5 }}>/ {String(total).padStart(2, '0')}</span>
          </span>
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: item.accent, opacity: 0.85 }}>
            {item.sub}
          </span>
        </div>
        <div className="card-label" style={{ transform: hovered ? 'translateY(-6px)' : 'none', transition: 'transform 0.5s' }}>
          <div className="h-px mb-5"
            style={{ background: `linear-gradient(90deg, ${item.accent}99, transparent)`, width: hovered ? 96 : 56, transition: 'width 0.5s' }} />
          <h2 className="font-mono font-light tracking-tight"
            style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', color: '#f4f4f4', lineHeight: 0.9 }}>
            {item.label}
          </h2>
          <span className="block font-mono text-[10px] tracking-[0.22em] uppercase mt-4 transition-all duration-300"
            style={{ color: item.live ? item.accent : 'rgba(208,214,222,0.25)', opacity: item.live ? (hovered ? 1 : 0.45) : 0.3 }}>
            {item.live ? <span>view project <ArrowOutward sx={{ fontSize: 9, verticalAlign: 'middle' }} /></span> : 'wip'}
          </span>
        </div>
      </div>

      {item.live && <Link href={item.href} className="absolute inset-0" />}
    </div>
  );
}

/* ────────── thesis illustrations ──────────
   Line-art in the page's language: mono strokes, cyan = plan/estimate,
   amber = constraint/learning. Paths with class "draw" are stroke-drawn
   on scroll (dash length measured at runtime); "pop" labels follow.   */

const INK    = 'rgba(207,214,222,0.4)';
const INK_HI = 'rgba(207,214,222,0.6)';
const CYAN   = '#8fd4ff';
const AMBER  = '#f0a050';
const MONO   = 'var(--font-geist-mono), ui-monospace, monospace';

function SvgText({ x, y, children, color = INK, anchor = 'start' }: {
  x: number; y: number; children: React.ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text x={x} y={y} className="pop" fontFamily={MONO} fontSize="9" letterSpacing="2"
      fill={color} textAnchor={anchor} style={{ textTransform: 'uppercase' }}>
      {children}
    </text>
  );
}

/* 01 — constrained crawl: hull cross-section, robot at fixed offset */
function IllCrawl() {
  return (
    <svg viewBox="0 0 520 340" fill="none" style={{ width: '100%', height: 'auto' }} aria-label="AUV crawling a ship hull at fixed offset">
      {/* hull plating: double curve + frame ticks */}
      <path className="draw" d="M20 302 Q 260 178 500 262" stroke={INK_HI} strokeWidth="1.2" />
      <path className="draw" d="M20 316 Q 260 192 500 276" stroke={INK} strokeWidth="0.8" />
      {[[68,279],[116,261],[164,246],[356,230],[404,237],[452,247]].map(([x,y],i) => (
        <line key={i} className="pop" x1={x} y1={y} x2={x} y2={y+14} stroke={INK} strokeWidth="0.8" />
      ))}

      {/* robot: hull-tangent frame */}
      <g transform="translate(260 230) rotate(-4.8)">
        {/* camera footprint */}
        <path className="pop" d="M0 -14 L -15 0 L 15 0 Z" fill="rgba(143,212,255,0.07)" stroke="rgba(143,212,255,0.3)" strokeWidth="0.8" />
        {/* magnetic wheels */}
        <circle className="draw" cx="-26" cy="-8" r="8" stroke={INK_HI} strokeWidth="1.2" fill="#0b0f16" />
        <circle className="draw" cx="26"  cy="-8" r="8" stroke={INK_HI} strokeWidth="1.2" fill="#0b0f16" />
        <circle className="pop" cx="-26" cy="-8" r="1.6" fill={INK_HI} />
        <circle className="pop" cx="26"  cy="-8" r="1.6" fill={INK_HI} />
        {/* body */}
        <rect className="draw" x="-40" y="-36" width="80" height="22" rx="4"
          stroke={CYAN} strokeWidth="1.2" fill="rgba(143,212,255,0.05)" />
        {/* normal constraint */}
        <line className="pop march" x1="0" y1="-36" x2="0" y2="-92"
          stroke={CYAN} strokeWidth="1" strokeDasharray="3 4" />
        <path className="pop" d="M-4 -84 L0 -92 L4 -84" stroke={CYAN} strokeWidth="1" />
        {/* offset bracket */}
        <line className="pop" x1="52" y1="0"   x2="52" y2="-14" stroke={AMBER} strokeWidth="1" />
        <line className="pop" x1="48" y1="0"   x2="56" y2="0"   stroke={AMBER} strokeWidth="1" />
        <line className="pop" x1="48" y1="-14" x2="56" y2="-14" stroke={AMBER} strokeWidth="1" />
        {/* surface velocity */}
        <g className="pulse-x">
          <line className="draw" x1="46" y1="-25" x2="96" y2="-25" stroke={INK_HI} strokeWidth="1" />
          <path className="pop" d="M90 -29 L96 -25 L90 -21" stroke={INK_HI} strokeWidth="1" />
        </g>
      </g>

      <SvgText x={276} y={128} color={CYAN}>n̂</SvgText>
      <SvgText x={322} y={224} color={AMBER}>d = const</SvgText>
      <SvgText x={368} y={198} color={INK_HI}>v ∥ surface</SvgText>
      <SvgText x={40}  y={330}>hull plating</SvgText>
      <line className="pop" x1="300" y1="284" x2="288" y2="246" stroke={INK} strokeWidth="0.6" />
      <SvgText x={304} y={292}>magnetic adhesion</SvgText>
    </svg>
  );
}

/* 02 — rl-mpc: policy with horizon fan, experience adjusting θ */
function IllLoop() {
  return (
    <svg viewBox="0 0 520 340" fill="none" style={{ width: '100%', height: 'auto' }} aria-label="Reinforcement learning tuning an MPC policy in closed loop">
      {/* MPC box */}
      <rect className="draw" x="36" y="96" width="212" height="158" rx="3" stroke={CYAN} strokeWidth="1.2" />
      <SvgText x={48} y={116} color={CYAN}>mpc — πθ(x)</SvgText>
      {/* horizon fan */}
      <circle className="pop" cx="66" cy="224" r="3" fill={CYAN} />
      <path className="draw fan-c" d="M66 224 Q 130 214 214 196" stroke={INK} strokeWidth="0.8" />
      <path className="draw fan-c" d="M66 224 Q 130 190 210 170" stroke={INK} strokeWidth="0.8" />
      <path className="draw fan-c" d="M66 224 Q 126 232 216 226" stroke={INK} strokeWidth="0.8" />
      <path id="mpc-opt" className="draw" d="M66 224 Q 132 206 212 160" stroke={CYAN} strokeWidth="1.4" />
      <circle className="mp-dot" data-path="#mpc-opt" data-dur="3.5" r="2.5" fill={CYAN} opacity="0" />
      {/* constraint boundary */}
      <line className="pop" x1="76" y1="168" x2="232" y2="148" stroke={AMBER} strokeWidth="1" strokeDasharray="4 4" />
      <SvgText x={96} y={140} color={AMBER}>g(x,u) ≤ 0</SvgText>
      <SvgText x={48} y={244}>horizon n</SvgText>

      {/* environment box */}
      <rect className="draw" x="340" y="120" width="148" height="84" rx="3" stroke={INK_HI} strokeWidth="1" />
      <SvgText x={414} y={158} color={INK_HI} anchor="middle">auv × hull</SvgText>
      <SvgText x={414} y={176} anchor="middle">currents · disturbance</SvgText>

      {/* closed loop */}
      <line className="draw" x1="248" y1="140" x2="334" y2="140" stroke={INK_HI} strokeWidth="1" />
      <path className="pop" d="M328 136 L334 140 L328 144" stroke={INK_HI} strokeWidth="1" />
      <SvgText x={284} y={132} color={CYAN}>u₀</SvgText>
      <line className="draw" x1="340" y1="196" x2="254" y2="196" stroke={INK_HI} strokeWidth="1" />
      <path className="pop" d="M260 192 L254 196 L260 200" stroke={INK_HI} strokeWidth="1" />
      <SvgText x={284} y={214}>x⁺</SvgText>

      {/* RL on top */}
      <circle className="draw" cx="414" cy="52" r="20" stroke={AMBER} strokeWidth="1.2" />
      <SvgText x={414} y={56} color={AMBER} anchor="middle">rl</SvgText>
      <line className="draw" x1="414" y1="120" x2="414" y2="76" stroke={INK} strokeWidth="0.8" />
      <path className="pop" d="M410 82 L414 76 L418 82" stroke={INK} strokeWidth="0.8" />
      <SvgText x={424} y={100}>r</SvgText>
      <path className="pop march-slow" d="M394 48 C 300 30 200 50 148 92" stroke={AMBER} strokeWidth="1" strokeDasharray="4 4" />
      <path className="pop" d="M154 84 L148 92 L158 94" stroke={AMBER} strokeWidth="1" />
      <SvgText x={210} y={36} color={AMBER}>Δθ — cost · model</SvgText>
    </svg>
  );
}

/* 03 — autonomous inspection: coverage path replanning around keep-outs */
function IllPath() {
  return (
    <svg viewBox="0 0 520 340" fill="none" style={{ width: '100%', height: 'auto' }} aria-label="Inspection coverage path replanned around obstacles on a hull section">
      <rect className="draw" x="30" y="36" width="460" height="268" rx="26" stroke={INK} strokeWidth="1" />
      <SvgText x={48} y={62}>hull section — port aft</SvgText>

      {/* keep-outs */}
      <circle className="pop march-slow" cx="200" cy="155" r="30" stroke={AMBER} strokeWidth="1" strokeDasharray="4 4" />
      {[[-16,10],[-4,20],[8,26]].map(([dx,dy],i) => (
        <line key={i} className="pop" x1={200+dx} y1={155-dy} x2={200+dx+12} y2={155-dy+12} stroke={AMBER} strokeWidth="0.6" opacity="0.5" />
      ))}
      <SvgText x={132} y={112} color={AMBER}>sea chest · keep-out</SvgText>
      <rect className="pop march-slow" x="330" y="170" width="26" height="104" stroke={AMBER} strokeWidth="1" strokeDasharray="4 4" />
      {[186,210,234,258].map((y,i) => (
        <line key={i} className="pop" x1="332" y1={y} x2="354" y2={y-14} stroke={AMBER} strokeWidth="0.6" opacity="0.5" />
      ))}
      <SvgText x={366} y={290} color={AMBER}>bilge keel</SvgText>

      {/* coverage path */}
      <path className="draw"
        d="M60 80 H460 C 492 80 492 140 460 140 H235 Q 200 92 165 140 H60 C 28 140 28 200 60 200 H315 Q 338 248 361 200 H460 C 492 200 492 260 460 260 H72"
        stroke={CYAN} strokeWidth="1.4" id="insp-path" />
      <circle className="mp-dot" data-path="#insp-path" data-dur="18" r="3" fill={CYAN} opacity="0" />
      <circle className="pop" cx="60" cy="80" r="4" fill={CYAN} />
      <circle className="idle-dot" r="3" fill={CYAN} opacity="0.9">
        <animateMotion dur="26s" repeatCount="indefinite"
          path="M60 80 H460 C 492 80 492 140 460 140 H235 Q 200 92 165 140 H60 C 28 140 28 200 60 200 H315 Q 338 248 361 200 H460 C 492 200 492 260 460 260 H72" />
      </circle>
      <path className="pop" d="M84 254 L72 260 L84 266" stroke={CYAN} strokeWidth="1.4" />

      {/* waypoints: replanned in amber, nominal in cyan */}
      {[[165,140],[235,140],[315,200],[361,200]].map(([x,y],i) => (
        <circle key={i} className="pop" cx={x} cy={y} r="3.2" fill={AMBER} />
      ))}
      {[[460,80],[60,140],[460,200],[60,200]].map(([x,y],i) => (
        <circle key={i} className="pop" cx={x} cy={y} r="2.4" fill="rgba(143,212,255,0.7)" />
      ))}
      <line className="pop" x1="196" y1="96" x2="200" y2="112" stroke={INK} strokeWidth="0.6" />
      <SvgText x={148} y={90} color={CYAN}>replanned</SvgText>
      <SvgText x={392} y={236} color={CYAN}>waypoint agent</SvgText>
    </svg>
  );
}
