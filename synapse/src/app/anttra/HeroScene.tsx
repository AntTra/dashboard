'use client';

import { useEffect, useRef } from 'react';

export default function HeroScene({ onReady }: { onReady: () => void }) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const mobile = window.innerWidth < 768;
    const dpr    = Math.min(window.devicePixelRatio, mobile ? 1 : 1.5);
    const w = mount.clientWidth;
    const h = mount.clientHeight;

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

    worker.postMessage({ type: 'init', canvas: offscreen, w, h, dpr, mobile }, [offscreen]);

    const onResize = () => {
      worker.postMessage({ type: 'resize', w: mount.clientWidth, h: mount.clientHeight });
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      worker.postMessage({ type: 'destroy' });
      worker.terminate();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
