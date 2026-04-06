import { NextResponse } from 'next/server';

const CENTER_LAT = 63.4122;
const CENTER_LON = 10.3997;
const FILTER_LAT = 0.013;  // ≈ 1.4 km N/S
const FILTER_LON = 0.027;  // ≈ 1.4 km E/W at this latitude

function getText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]+)<\/${tag}>`));
  return m ? m[1].trim() : '';
}

export async function GET() {
  try {
    const res = await fetch(
      'https://api.entur.io/realtime/v1/rest/vm?datasetId=ATB',
      {
        headers: { 'ET-Client-Name': 'synapse-anttra-busroutes' },
        cache: 'no-store',
      },
    );
    const xml = await res.text();

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
