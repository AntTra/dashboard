import * as THREE from 'three';

const N         = 80;
const MAX_CONN  = 150;
const CONN_DIST = 30;

const MOUSE_RADIUS = 30;
const MOUSE_FORCE  = 0.06;
const DAMPING      = 0.88;
const MAX_DISP     = 15;

let renderer:  THREE.WebGLRenderer;
let scene:     THREE.Scene;
let camera:    THREE.PerspectiveCamera;
let ptGeo:     THREE.BufferGeometry;
let lineGeo:   THREE.BufferGeometry;
let ptMat:     THREE.PointsMaterial;
let lineMat:   THREE.LineBasicMaterial;
let rafId:     number;

const bases    = new Float32Array(N * 3);
const phases   = new Float32Array(N * 3);
const speeds   = new Float32Array(N);
const isAccent = new Uint8Array(N);
const offset   = new Float32Array(N * 3);

const raycaster  = new THREE.Raycaster();
const mousePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5);
const mouseWorld = new THREE.Vector3();
const mouseNDC   = new THREE.Vector2(9999, 9999);

addEventListener('message', (e: MessageEvent) => {
  switch (e.data.type) {
    case 'init':      init(e.data);                         break;
    case 'resize':    onResize(e.data.w, e.data.h);         break;
    case 'mousemove': mouseNDC.set(e.data.x, e.data.y);    break;
    case 'destroy':
      cancelAnimationFrame(rafId);
      renderer?.dispose();
      ptGeo?.dispose(); lineGeo?.dispose();
      ptMat?.dispose(); lineMat?.dispose();
      break;
  }
});

function init({ canvas, w, h, dpr, mobile }: {
  canvas: OffscreenCanvas; w: number; h: number; dpr: number; mobile: boolean;
}) {
  const count = mobile ? Math.floor(N * 0.55) : N;
  const maxC  = mobile ? 80 : MAX_CONN;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1c1c20, 0.006);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 800);
  camera.position.set(0, 35, 90);
  camera.lookAt(0, 0, 0);

  const pPos = new Float32Array(count * 3);
  const pCol = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    bases[i*3]    = (Math.random() - 0.5) * 160;
    bases[i*3+1]  = (Math.random() - 0.5) * 55 + 5;
    bases[i*3+2]  = (Math.random() - 0.5) * 160;
    phases[i*3]   = Math.random() * Math.PI * 2;
    phases[i*3+1] = Math.random() * Math.PI * 2;
    phases[i*3+2] = Math.random() * Math.PI * 2;
    speeds[i]     = 0.25 + Math.random() * 0.4;
    isAccent[i]   = Math.random() < 0.12 ? 1 : 0;
    pPos[i*3]   = bases[i*3];
    pPos[i*3+1] = bases[i*3+1];
    pPos[i*3+2] = bases[i*3+2];
    if (isAccent[i]) {
      pCol[i*3] = 0.65; pCol[i*3+1] = 0.18; pCol[i*3+2] = 1.0;
    } else {
      const b = 0.75 + Math.random() * 0.2;
      pCol[i*3] = b; pCol[i*3+1] = b; pCol[i*3+2] = b;
    }
  }

  ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  ptGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
  ptMat = new THREE.PointsMaterial({ vertexColors: true, size: 1.8, sizeAttenuation: true, transparent: true, opacity: 0.9 });
  scene.add(new THREE.Points(ptGeo, ptMat));

  const lPos = new Float32Array(maxC * 6);
  const lCol = new Float32Array(maxC * 6);
  lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  lineGeo.setAttribute('color',    new THREE.BufferAttribute(lCol, 3));
  lineGeo.setDrawRange(0, 0);
  lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 });
  scene.add(new THREE.LineSegments(lineGeo, lineMat));

  let t = 0;
  let readyFired = false;

  const animate = () => {
    rafId = requestAnimationFrame(animate);
    t += 0.008;

    raycaster.setFromCamera(mouseNDC, camera);
    raycaster.ray.intersectPlane(mousePlane, mouseWorld);

    const posAttr = ptGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const s  = speeds[i];
      const bx = bases[i*3]   + Math.sin(t * s        + phases[i*3])   * 13;
      const by = bases[i*3+1] + Math.sin(t * s * 0.6  + phases[i*3+1]) * 6;
      const bz = bases[i*3+2] + Math.sin(t * s * 0.85 + phases[i*3+2]) * 13;

      const dx = bx - mouseWorld.x;
      const dz = bz - mouseWorld.z;
      const dist2 = dx*dx + dz*dz;
      if (dist2 < MOUSE_RADIUS * MOUSE_RADIUS && dist2 > 0.01) {
        const dist  = Math.sqrt(dist2);
        const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
        offset[i*3]   += (dx / dist) * force;
        offset[i*3+2] += (dz / dist) * force;
      }
      offset[i*3]   *= DAMPING;
      offset[i*3+2] *= DAMPING;
      if (offset[i*3]   >  MAX_DISP) offset[i*3]   =  MAX_DISP;
      if (offset[i*3]   < -MAX_DISP) offset[i*3]   = -MAX_DISP;
      if (offset[i*3+2] >  MAX_DISP) offset[i*3+2] =  MAX_DISP;
      if (offset[i*3+2] < -MAX_DISP) offset[i*3+2] = -MAX_DISP;

      posAttr.array[i*3]   = bx + offset[i*3];
      posAttr.array[i*3+1] = by;
      posAttr.array[i*3+2] = bz + offset[i*3+2];
    }
    posAttr.needsUpdate = true;

    const lp = lineGeo.attributes.position as THREE.BufferAttribute;
    const lc = lineGeo.attributes.color    as THREE.BufferAttribute;
    let lineCount = 0;
    outer: for (let i = 0; i < count; i++) {
      const ax = posAttr.array[i*3], ay = posAttr.array[i*3+1], az = posAttr.array[i*3+2];
      for (let j = i + 1; j < count; j++) {
        if (lineCount >= maxC) break outer;
        const bx = posAttr.array[j*3], by = posAttr.array[j*3+1], bz = posAttr.array[j*3+2];
        const dx = ax-bx, dy = ay-by, dz = az-bz;
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < CONN_DIST * CONN_DIST) {
          const a = (1 - Math.sqrt(d2) / CONN_DIST) * 0.9;
          const bi = lineCount * 6;
          lp.array[bi]   = ax; lp.array[bi+1] = ay; lp.array[bi+2] = az;
          lp.array[bi+3] = bx; lp.array[bi+4] = by; lp.array[bi+5] = bz;
          const ac = isAccent[i] || isAccent[j];
          const r = ac ? a*0.75 : a*0.72, g = ac ? a*0.12 : a*0.72, b = ac ? a : a*0.72;
          lc.array[bi]=r; lc.array[bi+1]=g; lc.array[bi+2]=b;
          lc.array[bi+3]=r; lc.array[bi+4]=g; lc.array[bi+5]=b;
          lineCount++;
        }
      }
    }
    lineGeo.setDrawRange(0, lineCount * 2);
    lp.needsUpdate = true;
    lc.needsUpdate = true;

    camera.position.x = Math.sin(t * 0.045) * 92;
    camera.position.z = Math.cos(t * 0.045) * 92;
    camera.position.y = 35 + Math.sin(t * 0.028) * 9;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (!readyFired) { readyFired = true; postMessage({ type: 'ready' }); }
  };
  animate();
}

function onResize(w: number, h: number) {
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
