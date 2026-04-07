'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
interface OsmData {
  buildings: { footprint: [number,number][]; height: number; type: string }[];
  roads:     { points:   [number,number][]; type: string }[];
}

const CENTER_LAT    = 63.4122;
const CENTER_LON    = 10.3997;
const M_PER_DEG_LAT = 111000;
const M_PER_DEG_LON = 111000 * Math.cos(CENTER_LAT * Math.PI / 180);
const SCENE_SCALE   = 3; // metres per scene unit

const RED = 0xff0088;
const GREEN = 0x00ffcc;
const WHITE = 0xffffff;

function gpsToScene(lat: number, lon: number): [number, number] {
  return [
    (lon - CENTER_LON) * M_PER_DEG_LON / SCENE_SCALE,
    -(lat - CENTER_LAT) * M_PER_DEG_LAT / SCENE_SCALE,
  ];
}

const STOPS = [
  { label: 'Lerkendal 1',            desc: 'from city',         lat: 63.411853,           lon: 10.399434,          color: 0xaa44ff },
  { label: 'Lerkendal 2',            desc: 'towards city',      lat: 63.411740,           lon: 10.399045,          color: 0xaa44ff },
  { label: 'Lerkendal 3',            desc: 'towards city',      lat: 63.412654,           lon: 10.399831,          color: 0xaa44ff },
  { label: 'Lerkendal 4',            desc: 'from city',         lat: 63.412515,           lon: 10.400432,          color: 0xaa44ff },
  { label: 'Hesthagen',              desc: 'approaching stop',  lat: 63.416813603641200,  lon: 10.397221457580931, color: GREEN },
  { label: 'Hesthagen',              desc: 'departing stop',    lat: 63.415498417151130,  lon: 10.398147029114945, color: RED },
  { label: 'Valøyvegen',             desc: 'approaching stop',  lat: 63.407950831670080,  lon: 10.398137286879060, color: RED },
  { label: 'Valøyvegen',             desc: 'departing stop',    lat: 63.409554361708760,  lon: 10.399296426408844, color: GREEN },
  { label: 'Lerkendal gård',         desc: 'departing stop',    lat: 63.413006,           lon: 10.409538,          color: GREEN },
  { label: 'Lerkendal gård',         desc: 'approaching stop',  lat: 63.412782,           lon: 10.407832,          color: RED },
  { label: 'Gløshaugen',             desc: '',  lat: 63.416835,           lon: 10.407556,          color: WHITE  },
  { label: 'Studentersamfundet', desc: '',  lat: 63.422596,           lon: 10.394623,          color: WHITE  },
  { label: 'Berg studentby',         desc: '',  lat: 63.413576,           lon: 10.414052,          color: WHITE  },
  { label: 'Karl Jonssons veg',     desc: '', lat: 63.401536, lon: 10.408706, color: WHITE },
  { label: 'Anton Grevskotts veg',  desc: '', lat: 63.403484, lon: 10.406089, color: WHITE },
  { label: 'Sorgenfri',             desc: '', lat: 63.407686, lon: 10.403809, color: WHITE },
  { label: 'Høgskoleringen',        desc: '', lat: 63.420867, lon: 10.404181, color: WHITE },
  { label: 'St. Olavs hospital',    desc: '', lat: 63.420757, lon: 10.390046, color: WHITE },
  { label: 'Bratsbergvegen',        desc: '', lat: 63.405387, lon: 10.397457, color: WHITE },
  { label: 'Siemens',               desc: '', lat: 63.403719, lon: 10.398836, color: WHITE },
  { label: 'Nyveibakken',           desc: '', lat: 63.423966, lon: 10.371359, color: WHITE },
  { label: 'Tvetestien',            desc: '', lat: 63.417785, lon: 10.372038, color: WHITE },
  { label: 'Marienborg stasjon',    desc: '', lat: 63.418056, lon: 10.382563, color: WHITE },
  { label: 'Thaulowbakken',         desc: '', lat: 63.412656, lon: 10.382222, color: WHITE },
  { label: 'Breidablikk',       desc: '', lat: 63.412383, lon: 10.376708, color: WHITE },
  { label: 'Gudruns gate',          desc: '', lat: 63.425210, lon: 10.382784, color: WHITE },
  { label: 'Ankers gate',           desc: '', lat: 63.424860, lon: 10.416855, color: WHITE },
  { label: 'Strinda vgs.',          desc: '', lat: 63.422046, lon: 10.427611, color: WHITE },
  { label: 'Nardosenteret',         desc: '', lat: 63.403569, lon: 10.426994, color: WHITE },
  { label: 'Nardokrysset',          desc: '', lat: 63.406960, lon: 10.423778, color: WHITE },
  { label: 'Sollia',                desc: '', lat: 63.399244, lon: 10.428297, color: WHITE },
  { label: 'E-verket',              desc: '', lat: 63.398881, lon: 10.401320, color: WHITE },
  { label: 'Nidarvoll skole',       desc: '', lat: 63.399155, lon: 10.404734, color: WHITE },
  { label: 'Valgrindvegen',         desc: '', lat: 63.409468, lon: 10.402859, color: WHITE },
  { label: 'Tempevegen 11',         desc: '', lat: 63.407804, lon: 10.396690, color: WHITE },
  { label: 'Sluppen',               desc: '', lat: 63.401921, lon: 10.395796, color: WHITE },
  { label: 'Trondheim hovedbrannstasjon', desc: '', lat: 63.399245, lon: 10.392889, color: WHITE },
  { label: 'Hoem',                  desc: '', lat: 63.405573, lon: 10.382777, color: WHITE },
  { label: 'Rognheim',              desc: '', lat: 63.399670, lon: 10.371500, color: WHITE },
].map(s => { const [x, z] = gpsToScene(s.lat, s.lon); return { ...s, x, z }; });

// All other OSM bus stops

const EXTRA_STOPS = ([
  { name: 'Karl Jonssons veg',             lat: 63.401536, lon: 10.408706 },
  { name: 'Karl Jonssons veg',             lat: 63.401403, lon: 10.408626 },
  { name: 'Anton Grevskotts veg',          lat: 63.403484, lon: 10.406089 },
  { name: 'Anton Grevskotts veg',          lat: 63.403844, lon: 10.405273 },
  { name: 'Sorgenfri',                     lat: 63.407686, lon: 10.403809 },
  { name: 'Sorgenfri',                     lat: 63.408158, lon: 10.403798 },
  { name: 'Høgskoleringen',                lat: 63.420867, lon: 10.404181 },
  { name: 'Høgskoleringen',                lat: 63.420675, lon: 10.404345 },
  { name: 'St. Olavs hospital øst',        lat: 63.420757, lon: 10.390046 },
  { name: 'St. Olavs hospital øst',        lat: 63.420565, lon: 10.390672 },
  { name: 'St. Olavs hospital vest',       lat: 63.420140, lon: 10.386390 },
  { name: 'St. Olavs hospital vest',       lat: 63.420240, lon: 10.386214 },
  { name: 'Bratsbergvegen',                lat: 63.405387, lon: 10.397457 },
  { name: 'Bratsbergvegen',                lat: 63.403358, lon: 10.395995 },
  { name: 'Siemens',                       lat: 63.403719, lon: 10.398836 },
  { name: 'Siemens',                       lat: 63.403907, lon: 10.399158 },
  { name: 'Nyveibakken',                   lat: 63.423966, lon: 10.371359 },
  { name: 'Nyveibakken',                   lat: 63.424582, lon: 10.370732 },
  { name: 'Tvetestien',                    lat: 63.417785, lon: 10.372038 },
  { name: 'Tvetestien',                    lat: 63.418174, lon: 10.372813 },
  { name: 'Marienborg stasjon',            lat: 63.418056, lon: 10.382563 },
  { name: 'Marienborg stasjon',            lat: 63.417816, lon: 10.382431 },
  { name: 'Marienborg stasjon (3)',        lat: 63.418820, lon: 10.382110 },
  { name: 'Marienborg',                    lat: 63.420000, lon: 10.377220 },
  { name: 'Marienborg',                    lat: 63.419179, lon: 10.377574 },
  { name: 'Thaulowbakken',                 lat: 63.412656, lon: 10.382222 },
  { name: 'Thaulowbakken',                 lat: 63.412857, lon: 10.382378 },
  { name: 'Breidablikkveien',              lat: 63.411088, lon: 10.382874 },
  { name: 'Breidablikkveien',              lat: 63.411228, lon: 10.382740 },
  { name: 'Breidablikk (3)',               lat: 63.412383, lon: 10.376708 },
  { name: 'Gudruns gate',                  lat: 63.425210, lon: 10.382784 },
  { name: 'Gudruns gate',                  lat: 63.425192, lon: 10.382576 },
  { name: 'Margretes gate',                lat: 63.423805, lon: 10.386485 },
  { name: 'Margretes gate',                lat: 63.423701, lon: 10.387090 },
  { name: 'Olav Kyrres gate',              lat: 63.420817, lon: 10.395515 },
  { name: 'Olav Kyrres gate',              lat: 63.420893, lon: 10.395006 },
  { name: 'Ankers gate',                   lat: 63.424860, lon: 10.416855 },
  { name: 'Ankers gate',                   lat: 63.424860, lon: 10.416655 },
  { name: 'Jonsvannsveien',                lat: 63.422610, lon: 10.413398 },
  { name: 'Jonsvannsveien',                lat: 63.422710, lon: 10.413242 },
  { name: 'Strinda vgs.',                  lat: 63.422046, lon: 10.427611 },
  { name: 'Bjarne Ness\' veg',             lat: 63.403824, lon: 10.429692 },
  { name: 'Nardosenteret',                 lat: 63.403569, lon: 10.426994 },
  { name: 'Nardosenteret',                 lat: 63.403333, lon: 10.427098 },
  { name: 'Nardokrysset',                  lat: 63.406960, lon: 10.423778 },
  { name: 'Nardokrysset',                  lat: 63.406281, lon: 10.424510 },
  { name: 'Omkjøringsveien Nardo',         lat: 63.407197, lon: 10.420690 },
  { name: 'Omkjøringsveien Nardo',         lat: 63.407524, lon: 10.423445 },
  { name: 'Fiolsvingen',                   lat: 63.409231, lon: 10.420476 },
  { name: 'Fiolsvingen',                   lat: 63.409025, lon: 10.420280 },
  { name: 'Tors veg',                      lat: 63.404835, lon: 10.427112 },
  { name: 'Steindalsvegen',                lat: 63.401170, lon: 10.428399 },
  { name: 'Steindalsvegen',                lat: 63.401157, lon: 10.428579 },
  { name: 'Sollia',                        lat: 63.399244, lon: 10.428297 },
  { name: 'E-verket',                      lat: 63.398726, lon: 10.401019 },
  { name: 'E-verket',                      lat: 63.398881, lon: 10.401320 },
  { name: 'Nidarvoll skole',               lat: 63.399155, lon: 10.404734 },
  { name: 'Valgrindvegen',                 lat: 63.409468, lon: 10.402859 },
  { name: 'Valgrindvegen',                 lat: 63.410365, lon: 10.402500 },
  { name: 'Sorgenfri',                     lat: 63.407686, lon: 10.403809 },
  { name: 'Tempevegen 11',                 lat: 63.407804, lon: 10.396690 },
  { name: 'Tempevegen 11',                 lat: 63.408087, lon: 10.397141 },
  { name: 'Tempe',                         lat: 63.403401, lon: 10.395612 },
  { name: 'Tempe',                         lat: 63.404822, lon: 10.396564 },
  { name: 'Sluppen',                       lat: 63.401921, lon: 10.395796 },
  { name: 'Sluppen',                       lat: 63.400950, lon: 10.395040 },
  { name: 'Trondheim hovedbrannstasjon',   lat: 63.399245, lon: 10.392889 },
  { name: 'Trondheim hovedbrannstasjon',   lat: 63.398801, lon: 10.392031 },
  { name: 'Nydalen',                       lat: 63.404563, lon: 10.386956 },
  { name: 'Nydalen',                       lat: 63.403445, lon: 10.387689 },
  { name: 'Hoem',                          lat: 63.405573, lon: 10.382777 },
  { name: 'Hoem',                          lat: 63.406137, lon: 10.382879 },
  { name: 'Rognheim',                      lat: 63.399670, lon: 10.371500 },
  { name: 'Rognheim',                      lat: 63.399749, lon: 10.371469 },
] as const).map(s => {
  const [x, z] = gpsToScene(s.lat, s.lon);
  return { label: s.name, desc: '', lat: s.lat, lon: s.lon, x, z, color: 0x006688 as number };
});

// Combined list used for arrival detection
const ALL_STOPS = [...STOPS, ...EXTRA_STOPS];

// Stops that trigger arrival notifications
const NOTIFY_LABELS = new Set(['Lerkendal 1','Lerkendal 2','Lerkendal 3','Lerkendal 4','Valøyvegen','Hesthagen','Lerkendal gård']);
const NOTIFY_STOPS  = ALL_STOPS.filter(s => NOTIFY_LABELS.has(s.label));

const BraindanceShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
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
      float gate    = pow(sin(time * 2.0) * 0.5 + 0.5, 20.0);
      float flicker = (sin(time * 31.0) * sin(time * 7.3) * 0.012) * gate;
      float vig     = smoothstep(0.85, 0.3, dist);
      vec3 col = vec3(r, g, b);
      col -= scan; col += flicker; col *= vig;
      col.r *= 0.88; col.b *= 1.08;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};


// Building wireframe from real footprint
function buildingLines(
  footprint: [number, number][],
  height: number,
  color: number,
  opacity: number,
): THREE.LineSegments {
  const verts: number[] = [];
  const n = footprint.length;
  for (let i = 0; i < n - 1; i++) {
    const [ax, az] = gpsToScene(footprint[i][1], footprint[i][0]);
    const [bx, bz] = gpsToScene(footprint[(i + 1) % (n - 1)][1], footprint[(i + 1) % (n - 1)][0]);
    const h = height / SCENE_SCALE;
    verts.push(ax, 0, az, bx, 0, bz);
    verts.push(ax, h, az, bx, h, bz);
    verts.push(ax, 0, az, ax, h, az);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

function stopMarker(color: number): THREE.Group {
  const group = new THREE.Group();
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), new THREE.MeshBasicMaterial({ color }));
  pillar.position.y = 1.5;
  group.add(pillar);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color }));
  sphere.position.y = 3.1;
  group.add(sphere);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.35, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01;
  group.add(ring);
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.55, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
  pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.01;
  pulse.userData.isPulse = true;
  group.add(pulse);
  return group;
}

function busMesh(line: string, color: number): THREE.Group {
  const group = new THREE.Group();

  // Body — larger sphere
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshBasicMaterial({ color }));
  body.position.y = 0.7;
  group.add(body);

  // Direction nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 6), new THREE.MeshBasicMaterial({ color }));
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.7, -1.1);
  group.add(nose);

  // Ground ring — shows exact map position
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.05, 24),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  // Vertical beacon line from ground to body
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0.02,0, 0,0.7,0], 3));
  group.add(new THREE.LineSegments(beaconGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })));

  // Point light
  const light = new THREE.PointLight(color, 2.5, 12);
  light.position.y = 0.7;
  group.add(light);

  // Sprite label
  const cw = 112, ch = 36;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, cw, ch);
  const hex = '#' + color.toString(16).padStart(6, '0');
  ctx.strokeStyle = hex + '99';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, cw - 2, ch - 2);
  ctx.fillStyle = hex;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(line, cw / 2, ch / 2);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
  sprite.scale.set(5.5, 1.75, 1);
  sprite.position.set(0, 2.2, 0);
  group.add(sprite);

  return group;
}


interface VehicleEntry { id: string; line: string; lat: number; lon: number; bearing: number; monitored: boolean }

const VEHICLE_FILTER_LAT = 0.020;
const VEHICLE_FILTER_LON = 0.040;

function xmlText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]+)<\/${tag}>`));
  return m ? m[1].trim() : '';
}

async function fetchVehicles() {
  const res = await fetch('https://api.entur.io/realtime/v1/rest/vm?datasetId=ATB', {
    headers: { 'ET-Client-Name': 'anttra-robotics-portfolio' }
  });
  const xml = await res.text();
  
  const activityRx = /<[^>]*VehicleActivity[^>]*>([\s\S]*?)<\/[^>]*VehicleActivity[^>]*>/g;
  
  const out = [];
  let m;

  while ((m = activityRx.exec(xml)) !== null) {
    const block = m[1];
    
    const lat = parseFloat(universalGet(block, 'Latitude'));
    const lon = parseFloat(universalGet(block, 'Longitude'));

    if (isNaN(lat) || isNaN(lon)) continue;

    if (out.length === 0) console.log("First Bus Sample:", { lat, lon });

    if (Math.abs(lat - CENTER_LAT) > 0.05) continue; 
    if (Math.abs(lon - CENTER_LON) > 0.05) continue;

    out.push({
      id:        universalGet(block, 'VehicleMonitoringRef') || universalGet(block, 'VehicleRef'),
      line:      universalGet(block, 'PublishedLineName'),
      lat, lon,
      bearing:   parseFloat(universalGet(block, 'Bearing')) || 0,
      monitored: universalGet(block, 'Monitored').includes('true'),
    });
  }

  console.log(`System Status: ${out.length} vehicles in sector.`);
  return out;
}

function universalGet(source, tag) {
  const regex = new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*${tag}[^>]*>`);
  const match = source.match(regex);
  return match ? match[1].trim() : '';
}

interface ArrivalNotif  { id: string; stop: string; desc: string; line: string; color: number; time: string }

// Distance threshold for "arriving": ~100 m real-world
const ARRIVE_DIST     = 33;  
const ARRIVE_COOLDOWN = 60_000;

export default function CyberpunkMap() {
  const mountRef      = useRef<HTMLDivElement>(null);
  const activeRef     = useRef(true);
  const sceneRef      = useRef<THREE.Scene | null>(null);
  const vehicleMeshes = useRef<Map<string, THREE.Group>>(new Map());
  const pulseMeshes    = useRef<THREE.Mesh[]>([]);
  const recentArrivals = useRef<Map<string, number>>(new Map());
  const [arrivals, setArrivals] = useState<ArrivalNotif[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;
    activeRef.current = true;
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000814);
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(W, H);
    labelRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    mount.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000814, 0.0018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1200);
    camera.position.set(200, 110, 0);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 0; controls.maxDistance = 500;
    controls.target.set(0, 0, 0);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshBasicMaterial({ color: 0x000610 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(1000, 120, 0x002233, 0x001122);
    scene.add(grid);

    // Bus stop markers
    STOPS.forEach(stop => {
      const marker = stopMarker(stop.color);
      marker.position.set(stop.x, 0, stop.z);
      marker.traverse(obj => { if (obj.userData.isPulse) pulseMeshes.current.push(obj as THREE.Mesh); });
      scene.add(marker);
      const light = new THREE.PointLight(stop.color, 1.5, 8);
      light.position.set(stop.x, 3, stop.z);
      scene.add(light);
      const div = document.createElement('div');
      div.style.cssText = `font-family:monospace;
                            font-size:0.65rem;
                            color:#${stop.color.toString(16).padStart(6,'0')};
                            background:rgba(0,0,0,0.7);
                            padding:2px 6px;
                            border:1px solid #${stop.color.toString(16).padStart(6,'0')}44;
                            border-radius:2px;
                            white-space:nowrap;
                            letter-spacing:0.08em;
                            text-transform:uppercase;
                            pointer-events:none;
                            opacity: 0.6`;
      div.textContent = stop.label;
      const label = new CSS2DObject(div);
      label.position.set(stop.x, 4.8, stop.z);
      scene.add(label);
    });

    // Generic stop markers — Points dot + instanced ground ring, 2 draw calls total
    {
      const N = EXTRA_STOPS.length;

      // Dots
      const pos = new Float32Array(N * 3);
      EXTRA_STOPS.forEach((s, i) => { pos[i*3] = s.x; pos[i*3+1] = 0.5; pos[i*3+2] = s.z; });
      const ptGeo = new THREE.BufferGeometry();
      ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      scene.add(new THREE.Points(ptGeo, new THREE.PointsMaterial({ color: 0x006688, size: 2.5, sizeAttenuation: true })));

      // Ground rings
      const ringGeo = new THREE.RingGeometry(0.22, 0.26, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x004455, side: THREE.DoubleSide });
      const rings   = new THREE.InstancedMesh(ringGeo, ringMat, N);
      const dummy   = new THREE.Object3D();
      dummy.rotation.x = -Math.PI / 2;
      EXTRA_STOPS.forEach((s, i) => {
        dummy.position.set(s.x, 0.01, s.z);
        dummy.updateMatrix();
        rings.setMatrixAt(i, dummy.matrix);
      });
      rings.instanceMatrix.needsUpdate = true;
      scene.add(rings);
    }

    scene.add(new THREE.AmbientLight(0x110022, 0.5));

    const composer = new EffectComposer(renderer);
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
      for (const pulse of pulseMeshes.current) {
        const scale = 1 + (Math.sin(t * 2 + pulse.parent!.position.x) * 0.5 + 0.5) * 1.2;
        pulse.scale.setScalar(scale);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.5 - (scale - 1) * 0.25;
      }
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
      pulseMeshes.current = [];
    };
  }, []);

  useEffect(() => {
    let worker: Worker | null = null;
    let cancelled = false;

    fetch('/osm_lerkendal.json')
      .then(r => r.json() as Promise<OsmData>)
      .then(data => {
        if (cancelled) return;
        worker = new Worker(new URL('./mapWorker.ts', import.meta.url), { type: 'module' });

        worker.onmessage = (e: MessageEvent<{
          bright: Float32Array; mid: Float32Array; dim: Float32Array;
          civic: Float32Array[]; resid: Float32Array[];
        }>) => {
          const scene = sceneRef.current;
          if (cancelled || !scene) return;

          const { bright, mid, dim, civic, resid } = e.data;

          // Roads 3 draw calls
          const addLines = (buf: Float32Array, color: number, transparent: boolean, opacity: number) => {
            if (!buf.length) return;
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(buf, 3));
            geo.computeBoundingSphere();
            scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent, opacity })));
          };
          addLines(bright, 0x00ffcc, false, 1);
          addLines(mid,    0x008855, true,  0.6);
          addLines(dim,    0x003322, true,  0.25);

          // Buildings 16 civic tiles + 16 resid tiles 
          for (const buf of civic) addLines(buf, RED, true, 0.28);
          for (const buf of resid) addLines(buf, 0x006666, true, 0.54);

          worker?.terminate();
          worker = null;
        };

        worker.postMessage(data);
      })
      .catch(() => { /* silently ignore */ });

    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, []);

  useEffect(() => {
    const update = async () => {
      const scene = sceneRef.current;
      if (!scene) return;
      try {
        const vehicles = await fetchVehicles();
        const seen = new Set<string>();
        const now  = Date.now();
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

          // Arrival detection — only notify for selected stops
          for (const stop of NOTIFY_STOPS) {
            if (Math.hypot(x - stop.x, z - stop.z) < ARRIVE_DIST) {
              const key  = `${v.id}:${stop.label}:${stop.desc}`;
              const last = recentArrivals.current.get(key) ?? 0;
              if (now - last > ARRIVE_COOLDOWN) {
                recentArrivals.current.set(key, now);
                const nid = `${key}:${now}`;
                const time = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
                setArrivals(prev => [...prev.slice(-4), { id: nid, stop: stop.label, desc: stop.desc, line: v.line || '?', color: stop.color, time }]);
                setTimeout(() => setArrivals(prev => prev.filter(a => a.id !== nid)), 5_000);
              }
            }
          }
        }
        for (const [id, mesh] of vehicleMeshes.current) {
          if (!seen.has(id)) { scene.remove(mesh); vehicleMeshes.current.delete(id); }
        }
      } catch { /* silently ignore */ }
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />

      {/* Noise grain */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        opacity: 0.04, mixBlendMode: 'overlay',
      }} />

      {/* Corner UI */}
      <div style={{
        position: 'absolute', bottom: '1.2rem', left: '1.2rem',
        fontFamily: 'monospace', fontSize: '1.0rem',
        color: '#00ffcc', opacity: 0.65, letterSpacing: '0.1em',
        textTransform: 'uppercase', lineHeight: 1.6, pointerEvents: 'none',
      }}>
        <div>lerkendal</div>
        <div style={{ color: '#ff0088' }}>trondheim · atb</div>
      </div>

      {/* Arrival popups */}
      <div style={{
        position: 'absolute', top: '1.2rem', right: '1.2rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        pointerEvents: 'none', zIndex: 10,
      }}>
        {arrivals.map(a => {
          const hex = '#' + a.color.toString(16).padStart(6, '0');
          return (
            <div key={a.id} style={{
              fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.08em',
              background: 'rgba(0,4,12,0.88)',
              border: `1px solid ${hex}55`,
              borderLeft: `3px solid ${hex}`,
              padding: '0.45rem 0.7rem',
              color: '#cce8ff',
              pointerEvents: 'auto',
              display: 'flex', flexDirection: 'column', gap: '0.15rem',
              minWidth: '180px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: hex, textTransform: 'uppercase' }}>
                  BUS {a.line} → {a.stop}
                </span>
                <span
                  style={{ cursor: 'pointer', opacity: 0.5, lineHeight: 1 }}
                  onClick={() => setArrivals(prev => prev.filter(n => n.id !== a.id))}
                >×</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 1, fontSize: '0.62rem', textTransform: 'uppercase' }}>
                <span>{a.desc}</span>
                <span style={{ color: '#ffffff' }}>{a.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '1.2rem', right: '1.2rem',
        fontFamily: 'monospace', fontSize: '1.0rem',
        opacity: 0.55, letterSpacing: '0.08em', lineHeight: 2,
        pointerEvents: 'none', textAlign: 'right',
      }}>
        <div style={{ color: '#ffdd00' }}>● live bus</div>
        <div style={{ color: '#ff0000' }}>● departing stop</div>
        <div style={{ color: '#00ffcc' }}>● approaching stop</div>
      </div>
    </div>
  );
}
