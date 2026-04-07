'use client';

import { useRef, useMemo } from 'react';
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
  "Nature’s revenge on the spirit.",
  "Your name is a lie told to a ghost.",
  "The biological trap is closing, and you are inside.",
  "We build towers of meaning to hide the fact that we are food for worms.",
];

export default function VoidPage() {
  const container = useRef<HTMLDivElement>(null);

  const stream = useMemo(() => 
    [...QUOTES, ...QUOTES].map((text, i) => ({
      text,
      x: Math.random() * 60 + 20 + "%", 
      delay: Math.random() * 20,
      duration: 30 + Math.random() * 20,
      size: 0.8 + Math.random() * 1.5 + "rem",
    })), []
  );

  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>('.quote-item').forEach((el, i) => {
      gsap.to(el, {
        y: "-120vh",
        duration: stream[i].duration,
        delay: stream[i].delay,
        repeat: -1,
        ease: "none",
      });

      gsap.to(el, {
        x: "+=30",
        duration: 3 + Math.random() * 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });

    gsap.to(".vignette", {
      opacity: 0.4,
      scale: 1.1,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    const handleMove = (e: MouseEvent) => {
      gsap.to(".shadow-light", {
        x: e.clientX,
        y: e.clientY,
        ease: "power2.out"
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);

  }, { scope: container });

  return (
    <main
      ref={container}
      className="relative min-h-screen bg-[#0a0908] text-[#9a918a] overflow-hidden select-none font-serif antialiased"
    >
      <div className="vignette fixed inset-0 z-40 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,1)] bg-radial-gradient" />
      
      <div className="shadow-light fixed top-0 left-0 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-30 opacity-60"
           style={{ background: 'radial-gradient(circle, rgba(0,0,0,1) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full h-screen">
        {stream.map((item, i) => (
          <p
            key={i}
            className="quote-item absolute italic opacity-0"
            style={{ 
              left: item.x, 
              top: '110%', 
              fontSize: item.size,
              maxWidth: '300px',
              animation: 'fadeIn 2s forwards',
              animationDelay: `${item.delay}s`
            }}
          >
            {item.text}
          </p>
        ))}
      </div>

      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-6 mix-blend-difference">
          <h1 className="text-6xl md:text-8xl font-light opacity-10 tracking-widest lowercase italic">
            zero fortune
          </h1>
        </div>
      </div>

      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
        <Link 
          href="/anttra" 
          className="text-xs italic tracking-[0.4em] opacity-20 hover:opacity-100 hover:text-white transition-all duration-1000"
        >
          I want to return
        </Link>
      </nav>

      <div className="fixed inset-0 pointer-events-none opacity-[0.08] mix-blend-multiply z-50 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.3; }
        }
      `}</style>
    </main>
  );
}