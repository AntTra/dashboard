// Runs off the main thread — no Three.js, pure math + typed arrays

const CENTER_LAT    = 63.4122;
const CENTER_LON    = 10.3997;
const M_PER_DEG_LAT = 111000;
const M_PER_DEG_LON = 111000 * Math.cos(CENTER_LAT * Math.PI / 180);
const SCENE_SCALE   = 3;

function gps(lat: number, lon: number): [number, number] {
  return [
    (lon - CENTER_LON) * M_PER_DEG_LON / SCENE_SCALE,
    -(lat - CENTER_LAT) * M_PER_DEG_LAT / SCENE_SCALE,
  ];
}

interface OsmBuilding { footprint: [number,number][]; height: number; type: string }
interface OsmRoad     { points:   [number,number][]; type: string }

self.onmessage = (e: MessageEvent<{ buildings: OsmBuilding[]; roads: OsmRoad[] }>) => {
  const { buildings, roads } = e.data;

  // ── Roads: 3 brightness buckets ──────────────────────────────────────────
  const brightV: number[] = [], midV: number[] = [], dimV: number[] = [];

  for (const road of roads) {
    const t = road.type;
    const bucket = ['motorway','trunk','primary','secondary'].includes(t) ? brightV
                 : ['tertiary','residential','unclassified'].includes(t)  ? midV
                 : dimV;
    for (let i = 0; i < road.points.length - 1; i++) {
      const [x0,z0] = gps(road.points[i][1],   road.points[i][0]);
      const [x1,z1] = gps(road.points[i+1][1], road.points[i+1][0]);
      bucket.push(x0, 0.05, z0, x1, 0.05, z1);
    }
  }

  // ── Buildings: 2 type buckets, 4×4 spatial chunks each ───────────────────
  // Scene is 1000×1000 units, tiles are 250×250
  const TILES = 4;
  const TILE_SIZE = 250;
  const HALF = (TILES * TILE_SIZE) / 2; // 500

  // civic[tileIndex] and resid[tileIndex] each hold a flat vertex array
  const civic: number[][] = Array.from({ length: TILES * TILES }, () => []);
  const resid: number[][] = Array.from({ length: TILES * TILES }, () => []);

  const CIVIC_TYPES = new Set(['university','public','school','hospital','government','church']);

  for (const b of buildings) {
    if (b.footprint.length < 3) continue;
    const n = b.footprint.length;
    const h = b.height / SCENE_SCALE;

    // Centroid for tile assignment
    let cx = 0, cz = 0;
    for (const [lon, lat] of b.footprint) {
      const [x, z] = gps(lat, lon);
      cx += x; cz += z;
    }
    cx /= n; cz /= n;

    const ti = Math.min(TILES - 1, Math.max(0, Math.floor((cx + HALF) / TILE_SIZE)));
    const tj = Math.min(TILES - 1, Math.max(0, Math.floor((cz + HALF) / TILE_SIZE)));
    const target = (CIVIC_TYPES.has(b.type) ? civic : resid)[tj * TILES + ti];

    for (let i = 0; i < n - 1; i++) {
      const [ax, az] = gps(b.footprint[i][1],           b.footprint[i][0]);
      const [bx, bz] = gps(b.footprint[(i+1)%(n-1)][1], b.footprint[(i+1)%(n-1)][0]);
      target.push(ax,0,az, bx,0,bz, ax,h,az, bx,h,bz, ax,0,az, ax,h,az);
    }
  }

  // Convert everything to transferable Float32Arrays
  const bright  = new Float32Array(brightV);
  const mid     = new Float32Array(midV);
  const dim     = new Float32Array(dimV);
  const civicF  = civic.map(a => new Float32Array(a));
  const residF  = resid.map(a => new Float32Array(a));

  const transferables: ArrayBuffer[] = [
    bright.buffer, mid.buffer, dim.buffer,
    ...civicF.map(f => f.buffer),
    ...residF.map(f => f.buffer),
  ];

  self.postMessage({ bright, mid, dim, civic: civicF, resid: residF }, transferables);
};
