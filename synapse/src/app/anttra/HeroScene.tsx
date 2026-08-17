'use client';

import { useEffect, useRef } from 'react';
import { isFirefox } from '@/lib/browser';

export default function HeroScene({ onReady }: { onReady: () => void }) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const mobile = window.innerWidth < 768;
    // Firefox's WebGL-in-worker (OffscreenCanvas) path is measurably slower
    // than Chromium's, so treat it like the mobile low-power tier.
    const lowPower = mobile || isFirefox();
    const dpr = Math.min(window.devicePixelRatio, lowPower ? 1 : 1.5);
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    mount.appendChild(canvas);

    // OffscreenCanvas not supported (Safari <16.4) — just fire ready
    if (typeof canvas.transferControlToOffscreen !== 'function') {
      onReadyRef.current();
      return () => { if (mount.contains(canvas)) mount.removeChild(canvas); };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(new URL('./heroWorker.ts', import.meta.url));

    worker.onmessage = (e) => {
      if (e.data.type === 'ready') onReadyRef.current();
    };

    worker.postMessage(
      { type: 'init', canvas: offscreen, w, h, dpr, lowPower, staticFrame: reduced },
      [offscreen],
    );

    const onResize = () => {
      worker.postMessage({ type: 'resize', w: mount.clientWidth, h: mount.clientHeight });
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      worker.postMessage({
        type: 'mousemove',
        x:  ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        y: -((e.clientY - rect.top)  / rect.height) * 2 + 1,
      });
    };
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      worker.postMessage({ type: 'scroll', p });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      worker.postMessage({ type: 'destroy' });
      worker.terminate();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
