'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const people = [
  {
    handle: 'anttra',
    href: '/anttra',
    bg: '#0c0515',
    accent: '#c77dff',
    role: 'cybernetics & robotics engineer',
    tags: ['AI', 'robotics', 'computer vision', 'control systems'],
    github: 'https://github.com/AntTra',
    email: 'anton.tran@live.no',
  },
  {
    handle: 'dotwavs',
    href: '/dotwavs',
    bg: '#010f09',
    accent: '#00e5a0',
    role: '3D artist',
    tags: ['3D', 'shaders', 'motion', 'javascript'],
    github: 'https://github.com/dotwavs',
    email: 'your@email.com',
  },
];

const stack: { label: string; owner: 'anttra' | 'dotwavs' | null }[] = [
  { label: 'TypeScript',  owner: null },
  { label: 'React',       owner: null },
  { label: 'Next.js',     owner: null },
  { label: 'Three.js',    owner: null },
  { label: 'R3F',         owner: null },
  { label: 'Tailwind',    owner: null },
  { label: 'Python',      owner: 'anttra' },
  { label: 'OpenCV',      owner: 'anttra' },
  { label: 'NumPy',       owner: 'anttra' },
  { label: 'Base UI',     owner: null },
  { label: 'GSAP',        owner: 'dotwavs' },
];

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {

      // Hero letters animate in on load
      gsap.from('.letter', {
        y: 80, opacity: 0, duration: 1,
        stagger: 0.06, ease: 'power4.out',
      });

      gsap.from('.scroll-hint', {
        opacity: 0, y: 8, duration: 0.6,
        delay: 0.9, ease: 'power2.out',
      });

      gsap.to('.scroll-arrow', {
        y: 6, repeat: -1, yoyo: true,
        duration: 0.8, ease: 'sine.inOut', delay: 1.1,
      });

      // Hero: pin while scrolling bleeds in both identity colors from each side.
      // Page starts totally black — the colors arrive as you commit to scrolling.
      const heroPinTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: '+=700',
          scrub: 1.5,
          pin: true,
        },
      });

      heroPinTl
        .to('.hero-glow-l', { opacity: 1, x: 40, duration: 1 }, 0.1)
        .to('.hero-glow-r', { opacity: 1, x: -40, duration: 1 }, 0.1)
        .to('.hero-title', { scale: 1.06, duration: 1, ease: 'power1.out' }, 0)
        .to('.scroll-hint', { opacity: 0, duration: 0.2 }, 0.5);

      // About
      gsap.from('.about-heading', {
        scrollTrigger: { trigger: '.about-section', start: 'top 75%' },
        x: -40, opacity: 0, duration: 0.8, ease: 'power3.out',
      });

      gsap.from('.about-col', {
        scrollTrigger: { trigger: '.about-section', start: 'top 65%' },
        y: 30, opacity: 0, duration: 0.9,
        stagger: 0.15, ease: 'power3.out',
      });

      // Stack
      gsap.from('.stack-heading', {
        scrollTrigger: { trigger: '.stack-section', start: 'top 80%' },
        x: -40, opacity: 0, duration: 0.8, ease: 'power3.out',
      });

      gsap.from('.stack-chip', {
        scrollTrigger: { trigger: '.stack-section', start: 'top 75%' },
        scale: 0.7, opacity: 0, duration: 0.5,
        stagger: 0.04, ease: 'back.out(1.4)',
      });

      // Each divider draws independently
      gsap.utils.toArray<HTMLElement>('.divider').forEach(el => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 90%' },
          scaleX: 0, duration: 1.2, ease: 'power3.out',
          transformOrigin: 'left',
        });
      });

      // Spaces
      gsap.from('.spaces-label', {
        scrollTrigger: { trigger: '.persons-section', start: 'top 80%' },
        opacity: 0, duration: 0.6,
      });

      gsap.from('.person-half', {
        scrollTrigger: { trigger: '.persons-section', start: 'top 70%' },
        opacity: 0, y: 30, duration: 1,
        stagger: 0.1, ease: 'power3.out',
      });

      // Contact
      gsap.from('.contact-heading', {
        scrollTrigger: { trigger: '.contact-section', start: 'top 80%' },
        x: -40, opacity: 0, duration: 0.8, ease: 'power3.out',
      });

      gsap.from('.contact-col', {
        scrollTrigger: { trigger: '.contact-section', start: 'top 75%' },
        y: 40, opacity: 0, duration: 0.8,
        stagger: 0.15, ease: 'power3.out',
      });

      // Initial hidden states
      gsap.set('.half-bg', { opacity: 0 });
      gsap.set('.person-line', { scaleX: 0, transformOrigin: 'left' });
      gsap.set('[class*="person-role-"]', { opacity: 0, y: 4 });
      gsap.set(['.hero-glow-l', '.hero-glow-r'], { opacity: 0 });

    }, root);

    return () => ctx.revert();
  }, []);

  const handleEnter = (i: number) => {
    gsap.to(`.half-bg-${i}`, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to(`.half-bg-${i === 0 ? 1 : 0}`, { opacity: 0, duration: 0.4 });
    gsap.to(`.person-label-${i}`, { color: people[i].accent, duration: 0.3, ease: 'power2.out' });
    gsap.to(`.person-role-${i}`, { opacity: 0.7, y: 0, duration: 0.4, ease: 'power2.out' });
    gsap.to(`.person-line-${i}`, { scaleX: 1, duration: 0.4, ease: 'power2.out' });
  };

  const handleLeave = (i: number) => {
    gsap.to(`.half-bg-${i}`, { opacity: 0, duration: 0.5, ease: 'power2.in' });
    gsap.to(`.person-label-${i}`, { color: '#ededed', duration: 0.3, ease: 'power2.in' });
    gsap.to(`.person-role-${i}`, { opacity: 0, y: 4, duration: 0.3, ease: 'power2.in' });
    gsap.to(`.person-line-${i}`, { scaleX: 0, duration: 0.35, ease: 'power2.in' });
  };

  return (
    <div ref={root} style={{ backgroundColor: '#0a0a0a', color: '#ededed' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* HERO */}
        <section
          className="hero-section min-h-screen relative flex flex-col items-center justify-center gap-8 overflow-hidden"
        >
          <div
            className="hero-glow-l absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at -15% 55%, ${people[0].accent}28 0%, transparent 60%)` }}
          />
          <div
            className="hero-glow-r absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 115% 55%, ${people[1].accent}28 0%, transparent 60%)` }}
          />

          <h1
            className="hero-title font-mono tracking-tight select-none flex"
            style={{ fontSize: 'clamp(4rem, 14vw, 10rem)', transformOrigin: 'center' }}
          >
            {'synapse'.split('').map((char, i) => (
              <span key={i} className="letter inline-block">{char}</span>
            ))}
          </h1>

          <div className="scroll-hint flex flex-col items-center gap-2" style={{ opacity: 0.3 }}>
            <span className="font-mono text-xs tracking-widest uppercase">scroll</span>
            <span className="scroll-arrow font-mono text-sm">↓</span>
          </div>
        </section>

        <div className="divider h-px mx-12" style={{ background: 'linear-gradient(to right, #c77dff44, #00e5a044)' }} />

        {/* ABOUT */}
        <section className="about-section min-h-screen flex flex-col justify-center px-12 md:px-24 py-32 gap-16">
          <p className="about-heading font-mono text-xs tracking-widest uppercase" style={{ opacity: 0.3 }}>
            about
          </p>
          <div className="flex flex-col md:flex-row gap-16 md:gap-24 max-w-5xl">
            <div className="about-col flex flex-col gap-6 md:w-1/2">
              <p
                className="font-mono leading-relaxed"
                style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', opacity: 0.85 }}
              >
                Synapse is a meeting point between a cybernetics engineer and a 3D artist —
                two students colliding disciplines to build things neither could alone.
              </p>
              <p className="font-mono text-sm leading-relaxed" style={{ opacity: 0.4 }}>
                Est. 2025 — Trondheim/Oslo
              </p>
            </div>
            <div className="about-col flex flex-col gap-8 md:w-1/2">
              {people.map(({ handle, role, tags, accent }) => (
                <div key={handle} className="flex flex-col gap-2">
                  <span className="font-mono text-sm" style={{ color: accent, opacity: 0.9 }}>{handle}</span>
                  <span className="font-mono text-sm" style={{ opacity: 0.5 }}>{role}</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="font-mono text-xs px-2 py-1"
                        style={{
                          border: `1px solid ${accent}33`,
                          color: `${accent}88`,
                          background: `${accent}08`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="divider h-px mx-12" style={{ background: 'linear-gradient(to right, #c77dff44, #00e5a044)' }} />

        {/* STACK */}
        <section className="stack-section flex flex-col justify-center px-12 md:px-24 py-32 gap-12">
          <p className="stack-heading font-mono text-xs tracking-widest uppercase" style={{ opacity: 0.3 }}>
            stack
          </p>
          <div className="flex flex-wrap gap-3">
            {stack.map(({ label, owner }) => {
              const accent = owner ? people.find(p => p.handle === owner)!.accent : null;
              return (
                <span
                  key={label}
                  className="stack-chip font-mono text-sm px-4 py-2"
                  style={{
                    border: `1px solid ${accent ? accent + '55' : '#ededed22'}`,
                    borderRadius: 2,
                    color: accent ? accent + 'cc' : '#ededed66',
                    background: accent ? accent + '0a' : 'transparent',
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </section>

        <div className="divider h-px mx-12" style={{ background: 'linear-gradient(to right, #c77dff44, #00e5a044)' }} />

        {/* SPACES */}
        <section className="persons-section flex flex-col" style={{ minHeight: '100vh' }}>
          <p
            className="spaces-label font-mono text-xs tracking-widest uppercase px-12 md:px-24 pt-16 pb-8"
            style={{ opacity: 0.3 }}
          >
            spaces
          </p>
          <div className="flex flex-1">
            {people.map(({ handle, href, bg, accent, role }, i) => (
              <Link
                key={handle}
                href={href}
                className="person-half relative flex flex-1 items-center justify-center overflow-hidden cursor-pointer"
                style={{ borderTop: '1px solid #ededed10' }}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={() => handleLeave(i)}
              >
                <div
                  className={`half-bg half-bg-${i} absolute inset-0`}
                  style={{
                    background: `radial-gradient(ellipse at center, ${accent}22 0%, ${bg} 65%)`,
                    pointerEvents: 'none',
                  }}
                />

                {i === 0 && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-px"
                    style={{ backgroundColor: '#ededed12', zIndex: 2 }}
                  />
                )}

                <div
                  className="relative flex flex-col items-center gap-3 py-24 px-8 select-none"
                  style={{ zIndex: 1 }}
                >
                  <span
                    className={`person-label-${i} font-mono`}
                    style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', color: '#ededed' }}
                  >
                    {handle}
                  </span>

                  <div
                    className={`person-line person-line-${i} h-px w-full`}
                    style={{ backgroundColor: accent }}
                  />

                  <span
                    className={`person-role-${i} font-mono text-xs tracking-widest uppercase`}
                    style={{ color: accent }}
                  >
                    {role}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="divider h-px mx-12" style={{ background: 'linear-gradient(to right, #c77dff44, #00e5a044)' }} />

        {/* CONTACT */}
        <section className="contact-section flex flex-col px-12 md:px-24 py-32 gap-16">
          <p className="contact-heading font-mono text-xs tracking-widest uppercase" style={{ opacity: 0.3 }}>
            contact
          </p>
          <div className="flex flex-col md:flex-row gap-16 md:gap-32">
            {people.map(({ handle, github, email, accent }) => (
              <div key={handle} className="contact-col flex flex-col gap-4">
                <span className="font-mono text-sm" style={{ color: accent, opacity: 0.8 }}>{handle}</span>
                <div className="flex flex-col gap-2">
                  <a
                    href={github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm transition-opacity hover:opacity-100"
                    style={{ opacity: 0.4 }}
                  >
                    github ↗
                  </a>
                  <a
                    href={`mailto:${email}`}
                    className="font-mono text-sm transition-opacity hover:opacity-100"
                    style={{ opacity: 0.4 }}
                  >
                    {email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer
          className="px-12 md:px-24 py-8 flex justify-between items-center"
          style={{ borderTop: '1px solid #ededed15' }}
        >
          <span className="font-mono text-xs" style={{ opacity: 0.2 }}>synapse</span>
          <span className="font-mono text-xs" style={{ opacity: 0.2 }}>{new Date().getFullYear()}</span>
        </footer>

      </div>
    </div>
  );
}
