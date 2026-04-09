'use client';

import { useEffect, useRef, useState } from 'react';

const CDN = (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`;
const VW = 640, VH = 480;
const BASE = 468;
const STEP = 4;
const NUM_STRIPS = 20;

// spatial offsets for each echo copy — rendered back-to-front
// dim: brightness multiplier for that echo pass
const ECHO_OFFSETS = [
  { dx: 2, dy: -55, dim: 0.45 }, // ghost — far back, dim
  { dx: -2, dy: +28, dim: 0.80 }, // echo below
  { dx: 2, dy: -28, dim: 0.80 }, // echo above
  { dx: 0, dy: 0, dim: 1.20 }, // base — on top, brightest
];

// per-strip color roles: [cr, cg, cb, brightness_boost]
// dark red → magenta → lit purple
const STRIP_ROLES: [number, number, number, number][] = [
  [0.60, 0.01, 0.06, 1.00], // dark red      (~55 % of strips)
  [0.95, 0.01, 0.05, 1.00], // magenta        (~30 %)
  [0.55, 0.06, 1.40, 1.80], // lit purple     (~15 %, brighter)
];

// discrete displacement levels
const SORT_LEVELS = [-1, -0.65, -0.3, 0.3, 0.65, 1];

type Phase = 'idle' | 'distorted';

export default function FaceMeshPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const handleClick = () => {
    phaseRef.current = phaseRef.current === 'idle' ? 'distorted' : 'idle';
  };

  useEffect(() => {
    stopRef.current = false;
    let faceMesh: any = null;
    let stream: MediaStream | null = null;
    let animFrame = 0;

    const liveFace = Array.from({ length: BASE }, () => ({ x: 0, y: 0 }));
    let hasLandmarks = false;

    const cols = Math.ceil(VW / STEP);
    const rows = Math.ceil(VH / STEP);
    const NG = cols * rows;

    const restX = new Float32Array(NG);
    const restY = new Float32Array(NG);
    const liveR = new Uint8Array(NG);
    const liveG = new Uint8Array(NG);
    const liveB = new Uint8Array(NG);

    for (let i = 0; i < NG; i++) {
      restX[i] = (i % cols) * STEP + STEP / 2;
      restY[i] = Math.floor(i / cols) * STEP + STEP / 2;
    }

    // strip properties
    const stripDir    = new Int8Array(NUM_STRIPS);
    const stripAmp    = new Float32Array(NUM_STRIPS);
    const stripLevel  = new Float32Array(NUM_STRIPS);
    const stripRole   = new Uint8Array(NUM_STRIPS);
    const stripSrcCol = new Uint8Array(NUM_STRIPS); // which column's pixels to sample

    function assignStrips() {
      for (let s = 0; s < NUM_STRIPS; s++) {
        stripDir[s]    = (s % 2 === 0 ? 1 : -1) * (Math.random() < 0.15 ? -1 : 1);
        stripAmp[s]    = 10 + Math.random() * 62;
        stripLevel[s]  = SORT_LEVELS[Math.floor(Math.random() * SORT_LEVELS.length)];
        stripSrcCol[s] = s; // start sampling own column
        const roll = Math.random();
        stripRole[s] = roll < 0.55 ? 0 : roll < 0.85 ? 1 : 2;
      }
    }

    const sampleCv = document.createElement('canvas');
    sampleCv.width = VW; sampleCv.height = VH;
    const sCtx = sampleCv.getContext('2d', { willReadFrequently: true })!;

    function sampleColors() {
      const video = videoRef.current; if (!video) return;
      sCtx.save(); sCtx.scale(-1, 1); sCtx.drawImage(video, -VW, 0, VW, VH); sCtx.restore();
      const img = sCtx.getImageData(0, 0, VW, VH).data;
      for (let i = 0; i < NG; i++) {
        const px = Math.max(0, Math.min(VW - 1, restX[i] | 0));
        const py = Math.max(0, Math.min(VH - 1, restY[i] | 0));
        const idx = (py * VW + px) * 4;
        liveR[i] = img[idx]; liveG[i] = img[idx + 1]; liveB[i] = img[idx + 2];
      }
    }

    let lastPhase: Phase = 'idle';

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: VW }, height: { ideal: VH } } });
        const video = videoRef.current!;
        video.srcObject = stream; await video.play();

        const canvas = canvasRef.current!;
        canvas.width = VW; canvas.height = VH;
        const ctx = canvas.getContext('2d')!;

        const imgData = ctx.createImageData(VW, VH);
        const buf = imgData.data;

        // write a 2-px wide vertical line segment into buf
        function writeLine(x: number, y0raw: number, y1raw: number,
          r: number, g: number, b: number) {
          const px = x | 0;
          if (px < 0 || px >= VW) return;
          const y0 = Math.max(0, Math.min(y0raw, y1raw) | 0);
          const y1 = Math.min(VH - 1, Math.max(y0raw, y1raw) | 0);
          for (let ly = y0; ly <= y1; ly++) {
            for (let lx = 0; lx < 2; lx++) {
              const qx = px + lx; if (qx >= VW) continue;
              const idx = (ly * VW + qx) * 4;
              buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
            }
          }
        }

        function draw() {
          if (stopRef.current) return;
          animFrame = requestAnimationFrame(draw);

          const phase = phaseRef.current;
          if (phase === 'distorted' && lastPhase === 'idle') assignStrips();
          lastPhase = phase;

          // adjacent-swap — 4 per frame (half speed)
          if (phase === 'distorted') {
            for (let k = 0; k < 2; k++) {
              const s = Math.floor(Math.random() * (NUM_STRIPS - 8));
              const tmpL = stripLevel[s];  stripLevel[s]  = stripLevel[s+8];  stripLevel[s+8]  = tmpL;
              const tmpR = stripRole[s];   stripRole[s]   = stripRole[s+8];   stripRole[s+8]   = tmpR;
              const tmpD = stripDir[s];    stripDir[s]    = stripDir[s+8];    stripDir[s+8]    = tmpD;
              const tmpS = stripSrcCol[s]; stripSrcCol[s] = stripSrcCol[s+8]; stripSrcCol[s+8] = tmpS;
            }
          }

          sampleColors();
          buf.fill(0);

          // ── live face bounds ─────────────────────────────────────────────
          let faceCx = VW / 2, faceCy = VH / 2;
          let faceRx = 80, faceRy = 100, faceMinX = faceCx - faceRx;
          let faceMinY = faceCy - faceRy, faceMaxY = faceCy + faceRy;
          if (hasLandmarks) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < BASE; i++) {
              if (liveFace[i].x < minX) minX = liveFace[i].x;
              if (liveFace[i].x > maxX) maxX = liveFace[i].x;
              if (liveFace[i].y < minY) minY = liveFace[i].y;
              if (liveFace[i].y > maxY) maxY = liveFace[i].y;
            }
            faceCx = (minX + maxX) / 2; faceCy = (minY + maxY) / 2;
            faceRx = (maxX - minX) / 2 * 0.9;
            faceRy = (maxY - minY) / 2 * 0.9;
            faceMinX = minX;
            faceMinY = minY;
            faceMaxY = maxY;
          }
          const stripW = (faceRx * 2) / NUM_STRIPS;

          // ── body grid (skip face ellipse in distorted mode) ─────────────
          for (let i = 0; i < NG; i++) {
            const r = Math.min(255, liveR[i] * 1.45 | 0);
            const g = Math.min(255, liveG[i] * 1.45 | 0);
            const b = Math.min(255, liveB[i] * 1.45 | 0);
            if (r + g + b < 18) continue;

            const px = restX[i] | 0, py = restY[i] | 0;
            if (px < 0 || px >= VW || py < 0 || py >= VH) continue;
            for (let dy2 = 0; dy2 < 2; dy2++) for (let dx2 = 0; dx2 < 2; dx2++) {
              const qx = px + dx2, qy = py + dy2;
              if (qx >= VW || qy >= VH) continue;
              const idx = (qy * VW + qx) * 4;
              buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
            }
          }

          // ── echo passes (distorted only) — back to front ─────────────────
          if (phase === 'distorted' && hasLandmarks) {
            for (const offset of ECHO_OFFSETS) {
              for (let i = 0; i < NG; i++) {
                const edx = (restX[i] - faceCx) / faceRx;
                const edy = (restY[i] - faceCy) / faceRy;
                if (edx*edx + edy*edy > 1) continue;

                const s = Math.max(0, Math.min(NUM_STRIPS - 1,
                  Math.floor((restX[i] - faceMinX) / stripW) | 0));

                // sample pixels from the source column (may be a different column after swaps)
                const srcX = faceMinX + (stripSrcCol[s] + 0.5) * stripW;
                const srcCol = Math.max(0, Math.min(cols - 1, (srcX / STEP) | 0));
                const j = Math.floor(i / cols) * cols + srcCol;
                const raw = liveR[j], gaw = liveG[j], baw = liveB[j];
                if (raw + gaw + baw < 18) continue;

                const role = STRIP_ROLES[stripRole[s]];
                const bright = 1.25 * offset.dim * role[3];
                const disp = stripDir[s] * stripAmp[s] * stripLevel[s];

                const cr = Math.min(255, raw * bright * role[0] | 0);
                const cg = Math.min(255, gaw * bright * role[1] | 0);
                const cb = Math.min(255, baw * bright * role[2] | 0);

                const originY = restY[i] + offset.dy;
                const dispY = originY + disp;
                const originX = restX[i] + offset.dx;

                writeLine(originX, originY, dispY, cr, cg, cb);
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
        }

        const fmModule = await import('@mediapipe/face_mesh');
        faceMesh = new fmModule.FaceMesh({ locateFile: CDN });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        faceMesh.onResults((r: any) => {
          if (stopRef.current) return;
          const lms = r.multiFaceLandmarks?.[0]; if (!lms) return;
          for (let i = 0; i < BASE; i++) {
            liveFace[i].x = (1 - lms[i].x) * VW;
            liveFace[i].y = lms[i].y * VH;
          }
          hasLandmarks = true;
        });

        setStatus('ready');
        draw();

        async function sendFrame() {
          if (stopRef.current) return;
          const vid = videoRef.current;
          if (vid && vid.readyState >= 2) await faceMesh.send({ image: vid });
          requestAnimationFrame(sendFrame);
        }
        sendFrame();

      } catch (e) { console.error(e); setStatus('error'); }
    }

    start();
    return () => {
      stopRef.current = true;
      cancelAnimationFrame(animFrame);
      stream?.getTracks().forEach(t => t.stop());
      faceMesh?.close();
    };
  }, []);

  return (
    <main
      onClick={handleClick}
      style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 720 }}>
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
        <canvas ref={canvasRef} style={{ width: '100%', display: 'block', cursor: 'pointer' }} />
        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'rgba(230,210,180,0.4)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            loading
          </div>
        )}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'rgba(230,150,130,0.6)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            camera denied
          </div>
        )}
      </div>
    </main>
  );
}
