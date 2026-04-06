'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ── Stop data (positions in scene units, 1 unit ≈ 3m) ───────────────────────

const STOPS = [
  { label: 'Lerkendal 1', desc: 'Holtermanns vei mot sentrum',       x:  9,  z:  2, color: 0x00ffcc },
  { label: 'Lerkendal 2', desc: 'Holtermanns vei ut av sentrum',      x:  9,  z: -2, color: 0x00ffcc },
  { label: 'Lerkendal 3', desc: 'Strindvegen ved gressvoll',          x: -7,  z: -6, color: 0xff0088 },
  { label: 'Lerkendal 4', desc: 'Strindvegen ved TrønderEnergi',      x: -7,  z: -2, color: 0xff0088 },
];

// ── Scanline + chromatic aberration shader ────────────────────────────────────

const BraindanceShader = {
  uniforms: {
    tDiffuse: { value: null },
    time:     { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec2 vUv;

    void main() {
      // Chromatic aberration — stronger at edges
      vec2 center = vUv - 0.5;
      float dist = length(center);
      vec2 aberr = normalize(center + 0.001) * dist * 0.006;

      float r = texture2D(tDiffuse, vUv + aberr).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - aberr).b;

      // Scanlines
      float scan = sin(vUv.y * 700.0) * 0.025;

      // Occasional flicker
      float flicker = sin(time * 31.0) * sin(time * 7.3) * 0.012;

      // Vignette
      float vig = smoothstep(0.85, 0.3, dist);

      vec3 col = vec3(r, g, b);
      col -= scan;
      col += flicker;
      col *= vig;

      // Tint — push slightly into cyan/purple
      col.r *= 0.88;
      col.b *= 1.08;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function seededRand(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return ((s >>> 0) / 0xffffffff);
  };
}

function buildingMesh(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const count = 55;

  for (let i = 0; i < count; i++) {
    const angle  = rand() * Math.PI * 2;
    const radius = 6 + rand() * 22;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const w = 0.4 + rand() * 1.8;
    const d = 0.4 + rand() * 1.8;
    const h = 0.8 + rand() * 7;

    const geo  = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(geo);

    const hue = rand() > 0.5 ? 0x00ffcc : 0xff0088;
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: 0.18 + rand() * 0.22 }),
    );

    line.position.set(x, h / 2, z);
    group.add(line);
  }
  return group;
}

function stopMarker(color: number): THREE.Group {
  const group = new THREE.Group();

  // Vertical pillar
  const pillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 6);
  const pillar    = new THREE.Mesh(pillarGeo, new THREE.MeshBasicMaterial({ color }));
  pillar.position.y = 1.5;
  group.add(pillar);

  // Top sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  sphere.position.y = 3.1;
  group.add(sphere);

  // Ground ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.35, 32),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  group.add(ring);

  // Outer pulse ring (animated separately)
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.55, 32),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
  );
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = 0.01;
  pulse.userData.isPulse = true;
  group.add(pulse);

  return group;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CyberpunkMap() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000814);
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(W, H);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(labelRenderer.domElement);

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x000814, 0.028);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    camera.position.set(0, 14, 20);
    camera.lookAt(0, 0, 0);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.maxPolarAngle  = Math.PI / 2.05;
    controls.minDistance    = 5;
    controls.maxDistance    = 60;
    controls.target.set(0, 0, 0);

    // Ground grid
    const grid = new THREE.GridHelper(80, 40, 0x003344, 0x001a22);
    scene.add(grid);

    // Ground plane (dark, slight emissive)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({ color: 0x000610 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    // Buildings
    const rand = seededRand(42);
    scene.add(buildingMesh(rand));

    // Bus stop markers + CSS labels
    STOPS.forEach(stop => {
      const marker = stopMarker(stop.color);
      marker.position.set(stop.x, 0, stop.z);
      scene.add(marker);

      // Point light per stop
      const light = new THREE.PointLight(stop.color, 1.5, 8);
      light.position.set(stop.x, 3, stop.z);
      scene.add(light);

      // CSS2D label
      const div = document.createElement('div');
      div.style.cssText = `
        font-family: monospace;
        font-size: 0.65rem;
        color: #${stop.color.toString(16).padStart(6,'0')};
        background: rgba(0,0,0,0.7);
        padding: 2px 6px;
        border: 1px solid #${stop.color.toString(16).padStart(6,'0')}44;
        border-radius: 2px;
        white-space: nowrap;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        pointer-events: none;
      `;
      div.textContent = stop.label;
      const label = new CSS2DObject(div);
      label.position.set(0, 3.8, 0);
      scene.add(label);
      // Position relative to stop, not marker (marker is already positioned)
      label.position.set(stop.x, 3.8, stop.z);
    });

    // Ambient light (very dim purple)
    scene.add(new THREE.AmbientLight(0x110022, 0.5));

    // ── Post-processing ────────────────────────────────────────────────────
    const composer   = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.4, 0.6, 0.0);
    composer.addPass(bloom);

    const braindance = new ShaderPass(BraindanceShader);
    composer.addPass(braindance);

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ─────────────────────────────────────────────────────
    let t = 0;
    const animate = () => {
      if (!activeRef.current) return;
      requestAnimationFrame(animate);
      t += 0.016;

      braindance.uniforms.time.value = t;
      controls.update();

      // Pulse rings
      scene.traverse(obj => {
        if (obj.userData.isPulse) {
          const scale = 1 + (Math.sin(t * 2 + obj.position.x) * 0.5 + 0.5) * 1.2;
          obj.scale.setScalar(scale);
          (obj as THREE.Mesh).material instanceof THREE.MeshBasicMaterial &&
            ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity !== undefined &&
            Object.assign((obj as THREE.Mesh).material, { opacity: 0.5 - (scale - 1) * 0.25 });
        }
      });

      composer.render();
      labelRenderer.render(scene, camera);
    };
    animate();

    return () => {
      activeRef.current = false;
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement))   mount.removeChild(renderer.domElement);
      if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Noise grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        opacity: 0.04,
        mixBlendMode: 'overlay',
      }} />

      {/* Corner UI */}
      <div style={{
        position: 'absolute', bottom: '1.2rem', left: '1.2rem',
        fontFamily: 'monospace', fontSize: '0.6rem',
        color: '#00ffcc', opacity: 0.35, letterSpacing: '0.1em',
        textTransform: 'uppercase', lineHeight: 1.6,
        pointerEvents: 'none',
      }}>
        <div>lerkendal</div>
        <div style={{ color: '#ff0088' }}>trondheim · atb</div>
      </div>
    </div>
  );
}
