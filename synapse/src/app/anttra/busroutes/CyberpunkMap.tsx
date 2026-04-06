'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ── GPS → Scene coordinate projection ────────────────────────────────────────

const CENTER_LAT    = 63.4122;
const CENTER_LON    = 10.3997;
const M_PER_DEG_LAT = 111000;
const M_PER_DEG_LON = 111000 * Math.cos(CENTER_LAT * Math.PI / 180); // ≈ 49 694
const SCENE_SCALE   = 3; // metres per scene unit

function gpsToScene(lat: number, lon: number): [number, number] {
  return [
    (lon - CENTER_LON) * M_PER_DEG_LON / SCENE_SCALE,
    -(lat - CENTER_LAT) * M_PER_DEG_LAT / SCENE_SCALE,
  ];
}

// ── Stop data (real GPS coords → scene units) ─────────────────────────────────

const STOPS = [
  { label: 'Lerkendal 1', desc: 'Holtermanns vei mot sentrum',   lat: 63.411853, lon: 10.399434, color: 0x00ffcc },
  { label: 'Lerkendal 2', desc: 'Holtermanns vei ut av sentrum', lat: 63.411740, lon: 10.399045, color: 0x00ffcc },
  { label: 'Lerkendal 3', desc: 'Strindvegen ved gressvoll',      lat: 63.412654, lon: 10.399831, color: 0xff0088 },
  { label: 'Lerkendal 4', desc: 'Strindvegen ved TrønderEnergi', lat: 63.412515, lon: 10.400432, color: 0xff0088 },
].map(s => {
  const [x, z] = gpsToScene(s.lat, s.lon);
  return { ...s, x, z };
});

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
      vec2 center = vUv - 0.5;
      float dist = length(center);
      vec2 aberr = normalize(center + 0.001) * dist * 0.006;

      float r = texture2D(tDiffuse, vUv + aberr).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - aberr).b;

      float scan    = sin(vUv.y * 700.0) * 0.025;
      float flicker = sin(time * 31.0) * sin(time * 7.3) * 0.012;
      float vig     = smoothstep(0.85, 0.3, dist);

      vec3 col = vec3(r, g, b);
      col -= scan;
      col += flicker;
      col *= vig;
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
  for (let i = 0; i < 80; i++) {
    const angle  = rand() * Math.PI * 2;
    const radius = 20 + rand() * 110;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const w = 0.5 + rand() * 2.2;
    const d = 0.5 + rand() * 2.2;
    const h = 1.0 + rand() * 9;

    const geo  = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(geo);
    const hue   = rand() > 0.5 ? 0x00ffcc : 0xff0088;
    const line  = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: hue, transparent: true, opacity: 0.15 + rand() * 0.2 }),
    );
    line.position.set(x, h / 2, z);
    group.add(line);
  }
  return group;
}

function stopMarker(color: number): THREE.Group {
  const group = new THREE.Group();

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 3, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  pillar.position.y = 1.5;
  group.add(pillar);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  sphere.position.y = 3.1;
  group.add(sphere);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.35, 32),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  group.add(ring);

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

function busMesh(line: string, color: number): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  group.add(body);

  // Direction arrow
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.5, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.55;
  group.add(nose);

  const light = new THREE.PointLight(color, 1.2, 5);
  group.add(light);

  const div = document.createElement('div');
  div.style.cssText = `
    font-family: monospace;
    font-size: 0.55rem;
    color: #${color.toString(16).padStart(6, '0')};
    background: rgba(0,0,0,0.7);
    padding: 1px 5px;
    border-radius: 1px;
    pointer-events: none;
    white-space: nowrap;
    letter-spacing: 0.06em;
  `;
  div.textContent = line;
  const label = new CSS2DObject(div);
  label.position.set(0, 0.9, 0);
  group.add(label);

  return group;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VehicleEntry { id: string; line: string; lat: number; lon: number; bearing: number; monitored: boolean }

export default function CyberpunkMap() {
  const mountRef       = useRef<HTMLDivElement>(null);
  const activeRef      = useRef(true);
  const sceneRef       = useRef<THREE.Scene | null>(null);
  const vehicleMeshes  = useRef<Map<string, THREE.Group>>(new Map());

  // ── Main Three.js setup ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;

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

    const scene = new THREE.Scene();
    scene.fog   = new THREE.FogExp2(0x000814, 0.004);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 600);
    camera.position.set(0, 110, 200);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.maxPolarAngle  = Math.PI / 2.05;
    controls.minDistance    = 10;
    controls.maxDistance    = 400;
    controls.target.set(0, 0, 0);

    const grid = new THREE.GridHelper(400, 80, 0x003344, 0x001a22);
    scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ color: 0x000610 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    const rand = seededRand(42);
    scene.add(buildingMesh(rand));

    STOPS.forEach(stop => {
      const marker = stopMarker(stop.color);
      marker.position.set(stop.x, 0, stop.z);
      scene.add(marker);

      const light = new THREE.PointLight(stop.color, 1.5, 8);
      light.position.set(stop.x, 3, stop.z);
      scene.add(light);

      const div = document.createElement('div');
      div.style.cssText = `
        font-family: monospace;
        font-size: 0.65rem;
        color: #${stop.color.toString(16).padStart(6, '0')};
        background: rgba(0,0,0,0.7);
        padding: 2px 6px;
        border: 1px solid #${stop.color.toString(16).padStart(6, '0')}44;
        border-radius: 2px;
        white-space: nowrap;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        pointer-events: none;
      `;
      div.textContent = stop.label;
      const label = new CSS2DObject(div);
      label.position.set(stop.x, 3.8, stop.z);
      scene.add(label);
    });

    scene.add(new THREE.AmbientLight(0x110022, 0.5));

    const composer   = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 1.4, 0.6, 0.0));
    const braindance = new ShaderPass(BraindanceShader);
    composer.addPass(braindance);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let t = 0;
    const animate = () => {
      if (!activeRef.current) return;
      requestAnimationFrame(animate);
      t += 0.016;
      braindance.uniforms.time.value = t;
      controls.update();

      scene.traverse(obj => {
        if (obj.userData.isPulse) {
          const scale = 1 + (Math.sin(t * 2 + obj.position.x) * 0.5 + 0.5) * 1.2;
          obj.scale.setScalar(scale);
          const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (mat) mat.opacity = 0.5 - (scale - 1) * 0.25;
        }
      });

      composer.render();
      labelRenderer.render(scene, camera);
    };
    animate();

    return () => {
      activeRef.current = false;
      sceneRef.current  = null;
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement))      mount.removeChild(renderer.domElement);
      if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement);
      vehicleMeshes.current.clear();
    };
  }, []);

  // ── Vehicle fetch loop ──────────────────────────────────────────────────
  useEffect(() => {
    const update = async () => {
      const scene = sceneRef.current;
      if (!scene) return;
      try {
        const vehicles: VehicleEntry[] = await fetch('/api/vehicles').then(r => r.json());
        const seen = new Set<string>();

        for (const v of vehicles) {
          seen.add(v.id);
          const [x, z] = gpsToScene(v.lat, v.lon);
          const color = v.monitored ? 0xffdd00 : 0xff7700;

          if (vehicleMeshes.current.has(v.id)) {
            const mesh = vehicleMeshes.current.get(v.id)!;
            mesh.position.set(x, 0.35, z);
            mesh.rotation.y = -(v.bearing * Math.PI / 180);
          } else {
            const mesh = busMesh(v.line || '?', color);
            mesh.position.set(x, 0.35, z);
            mesh.rotation.y = -(v.bearing * Math.PI / 180);
            scene.add(mesh);
            vehicleMeshes.current.set(v.id, mesh);
          }
        }

        for (const [id, mesh] of vehicleMeshes.current) {
          if (!seen.has(id)) {
            scene.remove(mesh);
            vehicleMeshes.current.delete(id);
          }
        }
      } catch { /* silently ignore fetch errors */ }
    };

    update();
    const id = setInterval(update, 6_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Noise grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        opacity: 0.04, mixBlendMode: 'overlay',
      }} />

      {/* Corner UI */}
      <div style={{
        position: 'absolute', bottom: '1.2rem', left: '1.2rem',
        fontFamily: 'monospace', fontSize: '0.6rem',
        color: '#00ffcc', opacity: 0.35, letterSpacing: '0.1em',
        textTransform: 'uppercase', lineHeight: 1.6, pointerEvents: 'none',
      }}>
        <div>lerkendal</div>
        <div style={{ color: '#ff0088' }}>trondheim · atb</div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '1.2rem', right: '1.2rem',
        fontFamily: 'monospace', fontSize: '0.55rem',
        opacity: 0.3, letterSpacing: '0.08em', lineHeight: 2,
        pointerEvents: 'none', textAlign: 'right',
      }}>
        <div style={{ color: '#ffdd00' }}>● live bus</div>
        <div style={{ color: '#ff7700' }}>● scheduled bus</div>
        <div style={{ color: '#00ffcc' }}>● stop</div>
      </div>
    </div>
  );
}
