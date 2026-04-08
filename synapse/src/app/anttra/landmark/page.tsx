'use client';

import { useEffect, useRef, useState } from 'react';

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],       // thumb
  [0,5],[5,6],[6,7],[7,8],       // index
  [0,9],[9,10],[10,11],[11,12],  // middle
  [0,13],[13,14],[14,15],[15,16],// ring
  [0,17],[17,18],[18,19],[19,20],// pinky
  [5,9],[9,13],[13,17],          // palm
];

const FINGER_COLORS = [
  '#ff0088', // thumb
  '#00ffcc', // index
  '#ffdd00', // middle
  '#ff7700', // ring
  '#aa44ff', // pinky
];

function fingerColor(idx: number): string {
  if (idx <= 4)  return FINGER_COLORS[0];
  if (idx <= 8)  return FINGER_COLORS[1];
  if (idx <= 12) return FINGER_COLORS[2];
  if (idx <= 16) return FINGER_COLORS[3];
  return FINGER_COLORS[4];
}

export default function LandmarkPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'init' | 'loading' | 'ready' | 'error'>('init');
  const [fps, setFps] = useState(0);
  const stopRef = useRef(false);

  useEffect(() => {
    stopRef.current = false;
    let handsInstance: any = null;
    let stream: MediaStream | null = null;
    let lastFpsTime = performance.now();
    let frameCount = 0;

    async function start() {
      setStatus('loading');
      try {
        // Webcam
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        // MediaPipe Hands — loaded from CDN to avoid bundling issues
        const { Hands } = await import('@mediapipe/hands');

        handsInstance = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
        });

        handsInstance.onResults((results: any) => {
          if (stopRef.current) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d')!;

          canvas.width  = results.image.width;
          canvas.height = results.image.height;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw video frame (mirrored)
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
              const pts = landmarks.map((lm: any) => ({
                x: (1 - lm.x) * canvas.width,
                y: lm.y * canvas.height,
              }));

              // Connections
              for (const [a, b] of HAND_CONNECTIONS) {
                ctx.beginPath();
                ctx.moveTo(pts[a].x, pts[a].y);
                ctx.lineTo(pts[b].x, pts[b].y);
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }

              // Landmark dots
              for (let i = 0; i < pts.length; i++) {
                const color = fingerColor(i);
                ctx.beginPath();
                ctx.arc(pts[i].x, pts[i].y, i === 0 ? 6 : 4, 0, Math.PI * 2);
                ctx.fillStyle = color + 'cc';
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }

          // FPS
          frameCount++;
          const now = performance.now();
          if (now - lastFpsTime >= 1000) {
            setFps(frameCount);
            frameCount = 0;
            lastFpsTime = now;
          }
        });

        setStatus('ready');

        // Send frames
        async function sendFrame() {
          if (stopRef.current) return;
          if (video.readyState >= 2) await handsInstance.send({ image: video });
          requestAnimationFrame(sendFrame);
        }
        sendFrame();

      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    }

    start();

    return () => {
      stopRef.current = true;
      stream?.getTracks().forEach(t => t.stop());
      handsInstance?.close();
    };
  }, []);

  return (
    <main style={{ backgroundColor: '#040404', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>

      {/* Status bar */}
      <div style={{ position: 'fixed', top: '1.2rem', left: '1.2rem', fontSize: '0.65rem', letterSpacing: '0.1em', color: '#00ffcc', opacity: 0.7, zIndex: 10 }}>
        <div style={{ textTransform: 'uppercase', marginBottom: '0.3rem', opacity: 0.5 }}>landmark controller</div>
        <div>
          <span style={{ opacity: 0.5 }}>state </span>
          <span style={{ color: status === 'ready' ? '#00ffcc' : status === 'error' ? '#ff0088' : '#ffdd00' }}>
            {status}
          </span>
        </div>
        {status === 'ready' && <div><span style={{ opacity: 0.5 }}>fps </span>{fps}</div>}
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 900 }}>
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
        <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 4, border: '1px solid rgba(255,255,255,0.07)' }} />

        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffdd00', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            background: 'rgba(4,4,4,0.9)',
          }}>
            loading model...
          </div>
        )}

        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ff0088', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            background: 'rgba(4,4,4,0.9)',
          }}>
            camera access denied or model failed to load
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        hand tracking
      </div>
    </main>
  );
}
