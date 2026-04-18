import { NextResponse } from 'next/server';

const CENTER_LAT = 63.4122;
const CENTER_LON = 10.3997;
const FILTER_LAT = 0.020;  // ≈ 2.2 km N/S
const FILTER_LON = 0.040;  // ≈ 2.2 km E/W at this latitude

// In-memory cache — share one Entur fetch across rapid/concurrent requests
let cache: { ts: number; data: string } | null = null;
const CACHE_TTL = 60_000; // ms

function getText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]+)<\/${tag}>`));
  return m ? m[1].trim() : '';
}

export async function GET() {
  try {
    let xml: string;
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      xml = cache.data;
    } else {
      const res = await fetch(
        'https://api.entur.io/realtime/v1/rest/vm?datasetId=ATB',
        {
          headers: { 'ET-Client-Name': 'synapse-anttra-busroutes' },
          cache: 'no-store',
        },
      );
      xml = await res.text();
      cache = { ts: now, data: xml };
    }

    const vehicles: {
      id: string;
      line: string;
      lat: number;
      lon: number;
      bearing: number;
      monitored: boolean;
    }[] = [];

    const blockRx = /<VehicleActivity>([\s\S]*?)<\/VehicleActivity>/g;
    let m: RegExpExecArray | null;

    while ((m = blockRx.exec(xml)) !== null) {
      const b = m[1];
      const lat = parseFloat(getText(b, 'Latitude'));
      const lon = parseFloat(getText(b, 'Longitude'));
      if (isNaN(lat) || isNaN(lon)) continue;
      if (Math.abs(lat - CENTER_LAT) > FILTER_LAT) continue;
      if (Math.abs(lon - CENTER_LON) > FILTER_LON) continue;

      vehicles.push({
        id:        getText(b, 'VehicleMonitoringRef') || getText(b, 'VehicleRef'),
        line:      getText(b, 'PublishedLineName'),
        lat,
        lon,
        bearing:   parseFloat(getText(b, 'Bearing')) || 0,
        monitored: getText(b, 'Monitored') === 'true',
      });
    }

    return NextResponse.json(vehicles);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
