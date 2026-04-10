'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useEffect, useRef, useState } from 'react';

const projects = [
  { name: 'CV', desc: "a little bit 'bout what I've done", href: '/anttra/cv', live: true },
  { name: 'Vertex globes', desc: 'globe viewer', href: '/anttra/globe', live: true },
  { name: 'Busroutes - Trondheim', desc: 'real-time transit api in Trondheim', href: '/anttra/busroutes', live: true },
  { name: 'Face mesh', desc: 'Blackwalled face', href: '/anttra/facemesh', live: true },
  { name: 'VOID', desc: 'face melter', href: '/anttra/void', live: false },
  { name: 'Master thesis notes', desc: 'documentation of my master thesis', href: '/anttra/master', live: false },
  { name: 'Landmark controller', desc: 'hand tracking + liquid glass', href: '/anttra/landmark', live: false },
];

export default function AnttraPage() {
  const container = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    // 1. Initial "Boot" sequence
    tl.from(".nav-item", { opacity: 0, y: -10, duration: 1 })
      .from(".main-title", { 
        opacity: 0, 
        x: -30, 
        filter: "blur(10px)", 
        duration: 1.5 
      }, "-=0.5")
      .from(".sub-text", { 
        width: 0, 
        opacity: 0, 
        duration: 1, 
        stagger: 0.2 
      }, "-=1")
      .from(".project-row", {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.8,
        borderTopColor: "transparent"
      }, "-=0.8")
      .from(".footer-link", { opacity: 0, duration: 1 }, "-=0.5");
  }, { scope: container });
  const [rows, setRows] = useState<string[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 20 }).map(() =>
      Math.random().toString(36).repeat(10)
    );
    setRows(generated);
  }, []);

  return (
    <main 
      ref={container}
      className="relative min-h-screen bg-[#040404] text-[#d0d0d0] px-8 md:px-24 py-16 selection:bg-white selection:text-black overflow-hidden"
    >
      {/* Background Tech Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] overflow-hidden font-mono text-[10px]">
        {rows.map((row, i) => (
          <div key={i} className="whitespace-nowrap leading-none mb-2">
            {row}
          </div>
        ))}
      </div>

      <nav className="nav-item relative z-10">
        <Link href="/" className="font-mono text-[10px] tracking-[0.3em] opacity-50 hover:opacity-100 transition-opacity">
          ← return
        </Link>
      </nav>

      <header className="mt-24 mb-32 relative z-10">
        <h1 className="main-title font-mono font-light leading-none tracking-tighter" style={{ fontSize: 'clamp(3rem, 15vw, 10rem)' }}>
          anttra
        </h1>
        <div className="flex items-center gap-4 mt-4 overflow-hidden">
          <div className="sub-text h-[1px] bg-white/20 w-12" />
          <p className="sub-text font-mono text-[10px] uppercase tracking-[0.15em] opacity-50">
            Cybernetics & Robotics
          </p>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl">
        {projects.map((proj, i) => (
          <ProjectRow key={i} {...proj} />
        ))}
        <div className="project-row h-[1px] w-full bg-white/10" />
      </div>

      <footer className="footer-link mt-32 relative z-10 flex items-center justify-between">
        <Link href="/anttra/void" className="font-mono text-[10px] opacity-20 hover:opacity-100 hover:tracking-[0.5em] transition-all duration-700">
          [VOID_SEGMENT]
        </Link>
      </footer>
    </main>
  );
}

function ProjectRow({ name, desc, href, live }: { name: string; desc: string; href: string; live: boolean }) {
  const rowRef  = useRef(null);
  const nameRef = useRef(null);
  const descRef = useRef(null);

  const onMouseEnter = () => {
    gsap.to(descRef.current, { opacity: 0.6, duration: 0.4 });
    if (!live) return;
    gsap.to(rowRef.current,  { backgroundColor: "rgba(255,255,255,0.03)", x: 10, duration: 0.4, ease: "power2.out" });
    gsap.to(nameRef.current, { x: 10, opacity: 1, duration: 0.4 });
  };

  const onMouseLeave = () => {
    gsap.to(descRef.current, { opacity: 0, duration: 0.4 });
    if (!live) return;
    gsap.to(rowRef.current,  { backgroundColor: "transparent", x: 0, duration: 0.4 });
    gsap.to(nameRef.current, { x: 0, opacity: 0.7, duration: 0.4 });
  };

  const content = (
    <div
      ref={rowRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="project-row flex justify-between items-baseline py-8 border-t border-white/10 cursor-pointer transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-12">
        <span ref={nameRef} className={`font-mono text-2xl md:text-3xl transition-opacity ${live ? 'opacity-70' : 'opacity-20'}`}>
          {name}
        </span>
        <span ref={descRef} className="font-mono text-[10px] uppercase tracking-widest opacity-0 hidden md:block">
          {desc}
        </span>
      </div>
      <span className="font-mono text-[10px] opacity-20">
        {live ? '' : 'Not Ready'}
      </span>
    </div>
  );

  return live ? <Link href={href}>{content}</Link> : content;
}