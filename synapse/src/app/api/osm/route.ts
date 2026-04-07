import { NextResponse } from 'next/server';

const BBOX   = '63.4068,10.3876,63.4176,10.4118'; // ±600 m around Lerkendal
const QUERY  = `[out:json][timeout:30];(way[building](${BBOX});way[highway](${BBOX}););out body;>;out skel qt;`;
const MIRROR = 'https://overpass.kumi.systems/api/interpreter';

export interface OsmBuilding {
  footprint: [number, number][];   // [lon, lat] pairs
  height:    number;               // metres
  type:      string;
}

export interface OsmRoad {
  points: [number, number][];      // [lon, lat] pairs
  type:   string;                  // highway tag value
}

export interface OsmData {
  buildings: OsmBuilding[];
  roads:     OsmRoad[];
}

function buildingHeight(tags: Record<string, string>): number {
  if (tags.height)             return Math.min(120, parseFloat(tags.height));
  if (tags['building:levels']) return Math.min(120, parseFloat(tags['building:levels']) * 3.5);
  const type = tags.building ?? '';
  if (type === 'university' || type === 'commercial') return 12;
  if (type === 'industrial' || type === 'warehouse')  return 9;
  return 7; // default residential
}

export async function GET() {
  try {
    const res = await fetch(MIRROR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(QUERY)}`,
      next: { revalidate: 3600 },
    });

    const json: { elements: { type: string; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }[] } = await res.json();

    // Index nodes by id
    const nodes = new Map<number, [number, number]>(); // id → [lon, lat]
    for (const el of json.elements) {
      if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
        nodes.set(el.id, [el.lon, el.lat]);
      }
    }

    const buildings: OsmBuilding[] = [];
    const roads:     OsmRoad[]     = [];

    for (const el of json.elements) {
      if (el.type !== 'way' || !el.nodes || !el.tags) continue;

      const pts = el.nodes.map(id => nodes.get(id)).filter(Boolean) as [number, number][];
      if (pts.length < 2) continue;

      if ('building' in el.tags) {
        buildings.push({
          footprint: pts,
          height:    buildingHeight(el.tags),
          type:      el.tags.building ?? 'yes',
        });
      } else if ('highway' in el.tags) {
        roads.push({
          points: pts,
          type:   el.tags.highway,
        });
      }
    }

    return NextResponse.json({ buildings, roads } satisfies OsmData);
  } catch {
    return NextResponse.json({ buildings: [], roads: [] }, { status: 500 });
  }
}
