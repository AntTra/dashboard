export const GQL     = 'https://api.entur.io/journey-planner/v3/graphql';
export const GEO     = 'https://api.entur.io/geocoder/v1/autocomplete';
export const HEADERS = { 'Content-Type': 'application/json', 'ET-Client-Name': 'synapse-anttra-busroutes' };

export const DEPARTURES_QUERY = `{
  quay1: quay(id: "NSR:Quay:73729") {
    description
    estimatedCalls(numberOfDepartures: 12, timeRange: 7200) {
      expectedDepartureTime aimedDepartureTime realtime
      destinationDisplay { frontText }
      serviceJourney { line { publicCode } }
    }
  }
  quay2: quay(id: "NSR:Quay:102720") {
    description
    estimatedCalls(numberOfDepartures: 12, timeRange: 7200) {
      expectedDepartureTime aimedDepartureTime realtime
      destinationDisplay { frontText }
      serviceJourney { line { publicCode } }
    }
  }
  quay3: quay(id: "NSR:Quay:73421") {
    description
    estimatedCalls(numberOfDepartures: 12, timeRange: 7200) {
      expectedDepartureTime aimedDepartureTime realtime
      destinationDisplay { frontText }
      serviceJourney { line { publicCode } }
    }
  }
  quay4: quay(id: "NSR:Quay:73420") {
    description
    estimatedCalls(numberOfDepartures: 12, timeRange: 7200) {
      expectedDepartureTime aimedDepartureTime realtime
      destinationDisplay { frontText }
      serviceJourney { line { publicCode } }
    }
  }
}`;

export const TRIP_QUERY = `
query Trip($from: Location!, $to: Location!, $dateTime: DateTime, $arriveBy: Boolean) {
  trip(from: $from, to: $to, dateTime: $dateTime, arriveBy: $arriveBy, numTripPatterns: 5) {
    tripPatterns {
      duration
      legs {
        mode realtime
        fromPlace { name }
        toPlace { name }
        line { publicCode }
        fromEstimatedCall { expectedDepartureTime }
        toEstimatedCall   { expectedArrivalTime }
      }
    }
  }
}`;

export interface Call {
  expectedDepartureTime: string;
  aimedDepartureTime: string;
  destinationDisplay: { frontText: string };
  serviceJourney: { line: { publicCode: string } };
  realtime: boolean;
}
export interface QuayData { description: string; estimatedCalls: Call[] }
export interface DepartureData { quay1: QuayData; quay2: QuayData; quay3: QuayData; quay4: QuayData }
export interface Suggestion { id: string; label: string }
export interface Leg {
  mode: string; realtime: boolean;
  fromPlace: { name: string }; toPlace: { name: string };
  line?: { publicCode: string };
  fromEstimatedCall?: { expectedDepartureTime: string };
  toEstimatedCall?: { expectedArrivalTime: string };
}
export interface TripPattern { duration: number; legs: Leg[] }
export interface VehicleEntry { id: string; line: string; lat: number; lon: number; bearing: number; monitored: boolean }

export async function fetchDepartures(): Promise<DepartureData> {
  const res  = await fetch(GQL, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query: DEPARTURES_QUERY }) });
  const json = await res.json();
  return json.data as DepartureData;
}

export async function searchStop(q: string): Promise<Suggestion[]> {
  if (q.length < 2) return [];
  const res  = await fetch(`${GEO}?text=${encodeURIComponent(q)}&layers=venue&size=6`);
  const json = await res.json();
  return (json.features ?? []).map((f: { properties: { id: string; label: string } }) => ({
    id: f.properties.id, label: f.properties.label,
  }));
}

export async function fetchTrip(
  from: Suggestion, to: Suggestion, dateTime: string, arriveBy: boolean,
): Promise<TripPattern[]> {
  const res  = await fetch(GQL, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify({ query: TRIP_QUERY, variables: { from: { place: from.id }, to: { place: to.id }, dateTime, arriveBy } }),
  });
  const json = await res.json();
  return json.data?.trip?.tripPatterns ?? [];
}

export async function fetchStopDepartures(quayId: string): Promise<{ time: string; line: string; dest: string }[]> {
  const query = `{ quay(id: "${quayId}") { estimatedCalls(numberOfDepartures: 6, timeRange: 3600) {
    expectedDepartureTime
    destinationDisplay { frontText }
    serviceJourney { line { publicCode } }
  } } }`;
  const res  = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const json = await res.json();
  return (json.data?.quay?.estimatedCalls ?? []).map((c: any) => ({
    time: new Date(c.expectedDepartureTime).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
    line: c.serviceJourney.line.publicCode,
    dest: c.destinationDisplay.frontText,
  }));
}

function universalGet(source: string, tag: string): string {
  const m = source.match(new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*${tag}[^>]*>`));
  return m ? m[1].trim() : '';
}

export async function fetchVehicles(): Promise<VehicleEntry[]> {
  const CENTER_LAT = 63.4105, CENTER_LON = 10.4045;
  const FILTER_LAT = 0.010,  FILTER_LON  = 0.022;

  const res = await fetch('https://api.entur.io/realtime/v1/rest/vm?datasetId=ATB', { cache: 'no-store' });
  const xml = await res.text();
  const activityRx = /<[^>]*VehicleActivity[^>]*>([\s\S]*?)<\/[^>]*VehicleActivity[^>]*>/g;
  const out: VehicleEntry[] = [];
  let m;
  while ((m = activityRx.exec(xml)) !== null) {
    const block = m[1];
    const lat = parseFloat(universalGet(block, 'Latitude'));
    const lon = parseFloat(universalGet(block, 'Longitude'));
    if (isNaN(lat) || isNaN(lon)) continue;
    if (Math.abs(lat - CENTER_LAT) > FILTER_LAT) continue;
    if (Math.abs(lon - CENTER_LON) > FILTER_LON) continue;
    out.push({
      id:        universalGet(block, 'VehicleMonitoringRef') || universalGet(block, 'VehicleRef'),
      line:      universalGet(block, 'PublishedLineName'),
      lat, lon,
      bearing:   parseFloat(universalGet(block, 'Bearing')) || 0,
      monitored: universalGet(block, 'Monitored').includes('true'),
    });
  }
  return out;
}
