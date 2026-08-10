import * as THREE from 'three';

/* ────────────────────────────────────────────────────────────────
   ARCTIC SEA / AIS SMOOTHER HERO
   - point-cloud ocean displaced by a shared GLSL wave field
   - amber "pings": noisy AIS measurements scattered along a track
   - a cyan estimate that repeatedly draws itself through them
   - faint aurora + stars behind
   All wave math lives in one GLSL snippet so sea, pings and the
   estimate ride the exact same surface.
   ──────────────────────────────────────────────────────────────── */

let renderer: THREE.WebGLRenderer;
let scene:    THREE.Scene;
let camera:   THREE.PerspectiveCamera;
let rafId     = 0;

const disposables: { dispose(): void }[] = [];

const mouse    = new THREE.Vector2(0, 0);   // target (NDC)
const mouseLp  = new THREE.Vector2(0, 0);   // low-passed
let   scrollN  = 0;                          // 0..1 hero scroll-out

const timeUniforms: { value: number }[] = [];
const drawUniforms: { value: number }[] = [];

const DRAW_PERIOD = 14;      // seconds per estimate sweep
const CAM_BASE    = new THREE.Vector3(0, 9, 62);

/* shared wave field ------------------------------------------------ */
const WAVE_GLSL = /* glsl */`
  float waveH(vec2 p, float t){
    float h = 0.0;
    h += sin(p.x * 0.052 + t * 0.85) * 1.55;
    h += sin(p.y * 0.041 - t * 0.60) * 1.25;
    h += sin((p.x + p.y) * 0.088 + t * 1.55) * 0.55;
    h += sin(p.x * 0.165 - t * 1.15 + p.y * 0.05) * 0.30;
    return h;
  }
`;

addEventListener('message', (e: MessageEvent) => {
  const d = e.data;
  switch (d.type) {
    case 'init':      init(d);                          break;
    case 'resize':    onResize(d.w, d.h);               break;
    case 'mousemove': mouse.set(d.x, d.y);              break;
    case 'scroll':    scrollN = d.p;                    break;
    case 'destroy':
      cancelAnimationFrame(rafId);
      disposables.forEach(x => x.dispose());
      renderer?.dispose();
      break;
  }
});

/* ── ocean ── */
function buildOcean(lowPower: boolean) {
  const NX = lowPower ? 96 : 170;
  const NZ = lowPower ? 56 : 96;
  const W  = 460, D = 300;
  const n  = NX * NZ;

  const pos  = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  let k = 0;
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX; ix++) {
      pos[k * 3]     = (ix / (NX - 1) - 0.5) * W;
      pos[k * 3 + 1] = 0;
      pos[k * 3 + 2] = (iz / (NZ - 1)) * -D + 45;
      rand[k]        = Math.random();
      k++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRand',    new THREE.BufferAttribute(rand, 1));

  const uTime = { value: 0 };
  timeUniforms.push(uTime);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite:  false,
    uniforms: { uTime, uDpr: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aRand;
      uniform float uTime, uDpr;
      varying float vFade, vCrest, vRand;
      ${WAVE_GLSL}
      void main(){
        vec3 p = position;
        float h = waveH(p.xz, uTime);
        p.y += h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        vFade  = (1.0 - smoothstep(60.0, 285.0, dist)) * smoothstep(6.0, 26.0, dist);
        vCrest = smoothstep(0.8, 3.2, h);
        vRand  = aRand;
        gl_PointSize = (1.1 + vCrest * 1.3) * uDpr * (140.0 / dist);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vFade, vCrest, vRand;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        if (dot(c, c) > 0.25) discard;
        vec3 deep  = vec3(0.075, 0.135, 0.20);
        vec3 crest = vec3(0.30, 0.50, 0.62);
        vec3 col = mix(deep, crest, vCrest);
        float a = vFade * (0.25 + 0.5 * vCrest) * (0.6 + 0.4 * vRand);
        gl_FragColor = vec4(col, a);
      }`,
  });

  disposables.push(geo, mat);
  scene.add(new THREE.Points(geo, mat));
  return mat;
}

/* ── trajectory: ground-truth-ish curve across the sea ── */
function trajectoryCurve() {
  const pts = [
    new THREE.Vector3(-215, 0,  -18),
    new THREE.Vector3(-120, 0,  -80),
    new THREE.Vector3( -30, 0,  -30),
    new THREE.Vector3(  55, 0, -110),
    new THREE.Vector3( 140, 0,  -55),
    new THREE.Vector3( 220, 0, -125),
  ];
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.6);
}

/* ── the estimate: cyan line drawing itself through the pings ── */
function buildEstimate(curve: THREE.CatmullRomCurve3, lowPower: boolean) {
  const SEG = lowPower ? 260 : 420;
  const pos = new Float32Array((SEG + 1) * 3);
  const aT  = new Float32Array(SEG + 1);
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const p = curve.getPoint(t);
    pos[i * 3] = p.x; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = p.z;
    aT[i] = t;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT',       new THREE.BufferAttribute(aT, 1));

  const uTime = { value: 0 }, uDraw = { value: 0 };
  timeUniforms.push(uTime); drawUniforms.push(uDraw);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    uniforms: { uTime, uDraw },
    vertexShader: /* glsl */`
      attribute float aT;
      uniform float uTime;
      varying float vT, vFade;
      ${WAVE_GLSL}
      void main(){
        vec3 p = position;
        p.y = waveH(p.xz, uTime) + 1.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFade = 1.0 - smoothstep(70.0, 300.0, -mv.z);
        vT = aT;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uDraw;
      varying float vT, vFade;
      void main(){
        // comet: visible tail behind the head, sharp front
        float head = uDraw;
        if (vT > head) discard;
        float tail = smoothstep(head - 0.80, head - 0.12, vT); // fade in toward head
        float hot  = smoothstep(head - 0.045, head, vT);       // bright head
        vec3 col = mix(vec3(0.28, 0.62, 0.85), vec3(0.75, 0.95, 1.0), hot);
        float a = vFade * (0.10 + 0.55 * tail + 1.4 * hot);
        gl_FragColor = vec4(col, a);
      }`,
  });

  disposables.push(geo, mat);
  scene.add(new THREE.Line(geo, mat));
}

/* ── the measurements: amber pings, noisy, off-track ── */
function buildPings(curve: THREE.CatmullRomCurve3, lowPower: boolean) {
  const N = lowPower ? 34 : 52;
  const pos    = new Float32Array(N * 3);
  const aT     = new Float32Array(N);
  const aPhase = new Float32Array(N);
  const aNoise = new Float32Array(N);

  // Irregular reporting intervals — some near-gaps. Build the raw steps first,
  // then normalise them onto [T0, T1]. Clamping instead piles every ping past
  // the walk's reach onto the final t, and that reach depends on N.
  const T0 = 0.015, T1 = 0.995;
  const steps = Array.from({ length: N }, () =>
    0.012 + Math.random() * 0.03 + (Math.random() < 0.12 ? 0.045 : 0));
  const stepScale = (T1 - T0) / steps.reduce((a, b) => a + b, 0);

  let t = T0;
  for (let i = 0; i < N; i++) {
    t += steps[i] * stepScale;
    const p   = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nrm = new THREE.Vector3(-tan.z, 0, tan.x);
    const off = (Math.random() - 0.5) * 2;
    const mag = 1.5 + Math.abs(off) * 6.5;      // gaussian-ish spread
    pos[i * 3]     = p.x + nrm.x * off * mag + (Math.random() - 0.5) * 2;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = p.z + nrm.z * off * mag + (Math.random() - 0.5) * 2;
    aT[i]     = t;
    aPhase[i] = Math.random() * Math.PI * 2;
    aNoise[i] = Math.abs(off);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT',       new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(aPhase, 1));
  geo.setAttribute('aNoise',   new THREE.BufferAttribute(aNoise, 1));

  const uTime = { value: 0 }, uDraw = { value: 0 }, uDpr = { value: 1 };
  timeUniforms.push(uTime); drawUniforms.push(uDraw);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    uniforms: { uTime, uDraw, uDpr },
    vertexShader: /* glsl */`
      attribute float aT, aPhase, aNoise;
      uniform float uTime, uDraw, uDpr;
      varying float vA, vHot;
      ${WAVE_GLSL}
      void main(){
        vec3 p = position;
        p.y = waveH(p.xz, uTime) + 1.4 + sin(uTime * 0.7 + aPhase) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float fade  = 1.0 - smoothstep(70.0, 300.0, -mv.z);
        float pulse = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase);
        // flare as the estimate's head sweeps past this measurement
        vHot = 1.0 - smoothstep(0.0, 0.05, abs(aT - uDraw));
        vA   = fade * (0.35 + 0.4 * pulse + 1.2 * vHot);
        gl_PointSize = (2.2 + aNoise * 1.4 + vHot * 3.0) * uDpr * (150.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA, vHot;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d2 = dot(c, c);
        if (d2 > 0.25) discard;
        float core = smoothstep(0.25, 0.0, d2);
        vec3 col = mix(vec3(0.95, 0.62, 0.28), vec3(1.0, 0.85, 0.6), vHot);
        gl_FragColor = vec4(col, vA * core);
      }`,
  });

  disposables.push(geo, mat);
  scene.add(new THREE.Points(geo, mat));
  return mat;
}

/* ── aurora + stars ── */
function buildSky(lowPower: boolean) {
  const uTime = { value: 0 };
  timeUniforms.push(uTime);

  const skyGeo = new THREE.PlaneGeometry(1400, 420);
  const skyMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite:  false,
    uniforms: { uTime },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv;
      void main(){
        float y = vUv.y;
        // two slow aurora ribbons
        float r1 = exp(-pow((y - (0.42 + 0.06 * sin(vUv.x * 6.2 + uTime * 0.11))) * 9.0, 2.0));
        float r2 = exp(-pow((y - (0.60 + 0.05 * sin(vUv.x * 4.1 - uTime * 0.07 + 2.0))) * 12.0, 2.0));
        float sway = 0.6 + 0.4 * sin(vUv.x * 11.0 + uTime * 0.16);
        vec3 col = vec3(0.10, 0.55, 0.38) * r1 * sway
                 + vec3(0.14, 0.38, 0.50) * r2;
        float a = (r1 * 0.16 + r2 * 0.10) * smoothstep(0.12, 0.4, y);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(0, 95, -300);
  scene.add(sky);
  disposables.push(skyGeo, skyMat);

  // stars
  const NS = lowPower ? 160 : 320;
  const sp = new Float32Array(NS * 3);
  const ph = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    sp[i * 3]     = (Math.random() - 0.5) * 1200;
    sp[i * 3 + 1] = 30 + Math.random() * 200;
    sp[i * 3 + 2] = -280 - Math.random() * 60;
    ph[i] = Math.random() * Math.PI * 2;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aPhase',   new THREE.BufferAttribute(ph, 1));
  const sm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime, uDpr: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aPhase;
      uniform float uTime, uDpr;
      varying float vA;
      void main(){
        vA = 0.25 + 0.35 * (0.5 + 0.5 * sin(uTime * 0.8 + aPhase));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 1.4 * uDpr;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main(){ gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), vA); }`,
  });
  scene.add(new THREE.Points(sg, sm));
  disposables.push(sg, sm);

  return { skyMat, starMat: sm };
}

/* ── init / loop ── */
function init({ canvas, w, h, dpr, lowPower, staticFrame }: {
  canvas: OffscreenCanvas; w: number; h: number; dpr: number;
  lowPower: boolean; staticFrame: boolean;
}) {
  renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);

  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 900);
  camera.position.copy(CAM_BASE);
  camera.lookAt(0, 4, -60);

  const oceanMat = buildOcean(lowPower);
  const curve    = trajectoryCurve();
  buildEstimate(curve, lowPower);
  const pingMat  = buildPings(curve, lowPower);
  const { starMat } = buildSky(lowPower);

  (oceanMat.uniforms.uDpr as { value: number }).value = dpr;
  (pingMat.uniforms.uDpr  as { value: number }).value = dpr;
  (starMat.uniforms.uDpr  as { value: number }).value = dpr;

  let t = 40;   // start mid-state so first frame isn't empty
  let readyFired = false;
  const clock = new THREE.Clock();

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    for (const u of timeUniforms) u.value = t;
    const sweep = (t / DRAW_PERIOD) % 1;
    for (const u of drawUniforms) u.value = sweep;

    // camera: sway + mouse parallax + scroll lift
    mouseLp.lerp(mouse, 0.03);
    camera.position.x = CAM_BASE.x + Math.sin(t * 0.05) * 3.5 + mouseLp.x * 5.0;
    camera.position.y = CAM_BASE.y + Math.sin(t * 0.031) * 0.7 + mouseLp.y * 2.2 + scrollN * 14;
    camera.position.z = CAM_BASE.z;
    camera.lookAt(mouseLp.x * 8, 4 - scrollN * 10, -60);

    renderer.render(scene, camera);

    if (!readyFired) { readyFired = true; postMessage({ type: 'ready' }); }
  };

  if (staticFrame) {
    // reduced motion: render one composed frame, no loop
    for (const u of timeUniforms) u.value = t;
    for (const u of drawUniforms) u.value = 0.72;
    renderer.render(scene, camera);
    postMessage({ type: 'ready' });
    return;
  }

  const loop = () => { rafId = requestAnimationFrame(loop); frame(); };
  loop();
}

function onResize(w: number, h: number) {
  if (!camera || !renderer) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
