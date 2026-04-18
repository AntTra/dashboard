'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const CyberpunkMap = dynamic(() => import('./CyberpunkMap'), { ssr: false });

// Cookie helpers 

function makeCookieHelpers(key: string) {
  const read = (): Set<string> => {
    if (typeof document === 'undefined') return new Set();
    const match = document.cookie.split('; ').find(r => r.startsWith(`${key}=`));
    if (!match) return new Set();
    const val = decodeURIComponent(match.split('=')[1]);
    return new Set(val ? val.split(',') : []);
  };
  const write = (s: Set<string>) => {
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    document.cookie = `${key}=${encodeURIComponent([...s].join(','))}; expires=${exp.toUTCString()}; path=/`;
  };
  return { read, write };
}

const linesCookie = makeCookieHelpers('busroutes_hidden_lines');
const quaysCookie = makeCookieHelpers('busroutes_hidden_quays');

// Constants 

const GQL = 'https://api.entur.io/journey-planner/v3/graphql';
const GEO = 'https://api.entur.io/geocoder/v1/autocomplete';
const HEADERS = { 'Content-Type': 'application/json', 'ET-Client-Name': 'synapse-anttra-busroutes' };

const DEPARTURES_QUERY = `{
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

const TRIP_QUERY = `
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

// Types

interface Call {
  expectedDepartureTime: string;
  aimedDepartureTime: string;
  destinationDisplay: { frontText: string };
  serviceJourney: { line: { publicCode: string } };
  realtime: boolean;
}

interface QuayData { description: string; estimatedCalls: Call[] }
interface DepartureData { quay1: QuayData; quay2: QuayData; quay3: QuayData; quay4: QuayData }

interface Suggestion { id: string; label: string }

interface Leg {
  mode: string; realtime: boolean;
  fromPlace: { name: string }; toPlace: { name: string };
  line?: { publicCode: string };
  fromEstimatedCall?: { expectedDepartureTime: string };
  toEstimatedCall?: { expectedArrivalTime: string };
}
interface TripPattern { duration: number; legs: Leg[] }

// Helpers

const minsUntil  = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 60000);
const delayMins  = (c: Call)     => Math.round((new Date(c.expectedDepartureTime).getTime() - new Date(c.aimedDepartureTime).getTime()) / 60000);
const fmt        = (iso: string) => new Date(iso).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
const fmtDur     = (s: number)   => `${Math.floor(s / 60)} min`;

const S: Record<string, React.CSSProperties> = {
  mono: { fontFamily: 'monospace' },
};

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// Sub-components

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'monospace', fontSize: '0.72rem',
        padding: '0.25rem 0.6rem',
        border: `1px solid ${active ? '#d0d0d055' : '#d0d0d018'}`,
        borderRadius: 2,
        background: active ? '#d0d0d010' : 'transparent',
        color: active ? '#d0d0d0' : '#d0d0d033',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function DepartureRow({ call, hidden }: { call: Call; hidden: boolean }) {
  const mins   = minsUntil(call.expectedDepartureTime);
  const delay  = delayMins(call);
  const mobile = useIsMobile();
  if (mins < 0 || hidden) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: `1px solid ${mobile ? '#d0d0d018' : '#d0d0d00a'}` }}>
      <span style={{ ...S.mono, fontSize: mobile ? '1rem' : '0.85rem', fontWeight: 700, minWidth: '2.5rem', opacity: 1 }}>
        {call.serviceJourney.line.publicCode}
      </span>
      {!mobile && (
        <span style={{ ...S.mono, fontSize: '0.78rem', opacity: 0.55, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {call.destinationDisplay.frontText}
        </span>
      )}
      {mobile && delay > 0 && (
        <span style={{ ...S.mono, fontSize: '0.7rem', color: '#e05555' }}>+{delay}</span>
      )}
      {!mobile && delay > 0 && (
        <span style={{ ...S.mono, fontSize: '0.65rem', color: '#cc4444', opacity: 0.85 }}>+{delay}</span>
      )}
      <span style={{ ...S.mono, fontSize: mobile ? '1rem' : '0.88rem', minWidth: '4rem', textAlign: 'right', marginLeft: 'auto', opacity: mins > 15 ? (mobile ? 0.55 : 0.35) : 1, color: call.realtime ? '#d0d0d0' : (mobile ? '#aaa' : '#888') }}>
        {mins === 0 ? 'nå' : `${mins} min`}
      </span>
    </div>
  );
}

function QuayPanel({ label, quay, hidden }: { label: string; quay: QuayData; hidden: Set<string> }) {
  const visible = quay.estimatedCalls.filter(c => minsUntil(c.expectedDepartureTime) >= 0 && !hidden.has(c.serviceJourney.line.publicCode));
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <p style={{ ...S.mono, fontSize: '0.62rem', opacity: 0.85, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
        Lerkendal {label}
      </p>
      <p style={{ ...S.mono, fontSize: '0.68rem', opacity: 0.72, marginBottom: '1.2rem' }}>{quay.description}</p>
      {visible.length === 0
        ? <p style={{ ...S.mono, fontSize: '0.72rem', opacity: 0.38 }}>no departures</p>
        : quay.estimatedCalls.map((c, i) => (
            <DepartureRow key={i} call={c} hidden={hidden.has(c.serviceJourney.line.publicCode)} />
          ))
      }
    </div>
  );
}

function StopInput({
  placeholder, value, onChange, suggestions, onSelect, onClear,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: Suggestion[];
  onSelect: (s: Suggestion) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d0d0d018', borderRadius: 2 }}>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          style={{
            ...S.mono, fontSize: '0.8rem', background: 'transparent',
            border: 'none', outline: 'none', color: '#d0d0d0',
            padding: '0.55rem 0.75rem', flex: 1, width: '100%',
          }}
        />
        {value && (
          <button onClick={onClear} style={{ ...S.mono, background: 'none', border: 'none', color: '#d0d0d044', cursor: 'pointer', padding: '0 0.6rem', fontSize: '0.8rem' }}>×</button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#0e0e0e', border: '1px solid #d0d0d015', borderTop: 'none', borderRadius: '0 0 2px 2px' }}>
          {suggestions.map(s => (
            <button
              key={s.id}
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              style={{ ...S.mono, display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #d0d0d008', color: '#d0d0d077', fontSize: '0.75rem', padding: '0.55rem 0.75rem', cursor: 'pointer' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TripResult({ pattern }: { pattern: TripPattern }) {
  const first = pattern.legs[0]?.fromEstimatedCall?.expectedDepartureTime;
  const last  = pattern.legs[pattern.legs.length - 1]?.toEstimatedCall?.expectedArrivalTime;
  const lines = pattern.legs.filter(l => l.line).map(l => l.line!.publicCode);

  return (
    <div style={{ padding: '1rem 0', borderBottom: '1px solid #d0d0d00a' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <span style={{ ...S.mono, fontSize: '0.9rem', opacity: 0.85 }}>
          {first ? fmt(first) : '—'} → {last ? fmt(last) : '—'}
        </span>
        <span style={{ ...S.mono, fontSize: '0.7rem', opacity: 0.3 }}>{fmtDur(pattern.duration)}</span>
        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
          {lines.map((l, i) => (
            <span key={i} style={{ ...S.mono, fontSize: '0.72rem', padding: '0.15rem 0.45rem', border: '1px solid #d0d0d022', color: '#d0d0d077' }}>{l}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {pattern.legs.map((leg, i) => (
          <span key={i} style={{ ...S.mono, fontSize: '0.65rem', opacity: 0.25 }}>
            {leg.fromPlace.name}{i < pattern.legs.length - 1 ? ' →' : ` → ${leg.toPlace.name}`}
          </span>
        ))}
      </div>
    </div>
  );
}

// Page

export default function BusRoutesPage() {
  // Departures
  const [data,        setData]        = useState<DepartureData | null>(null);
  const [fetchErr,    setFetchErr]    = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hidden,      setHidden]      = useState<Set<string>>(new Set());
  const [hiddenQuays, setHiddenQuays] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHidden(linesCookie.read());
    setHiddenQuays(quaysCookie.read());
  }, []);

  // Journey planner
  const [fromQuery,   setFromQuery]   = useState('');
  const [toQuery,     setToQuery]     = useState('');
  const [fromStop,    setFromStop]    = useState<Suggestion | null>(null);
  const [toStop,      setToStop]      = useState<Suggestion | null>(null);
  const [fromSugg,    setFromSugg]    = useState<Suggestion[]>([]);
  const [toSugg,      setToSugg]      = useState<Suggestion[]>([]);
  const [trips,       setTrips]       = useState<TripPattern[] | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripErr,     setTripErr]     = useState(false);
  const [toSlideOpen, setToSlideOpen] = useState(false);
  const [arriveBy,    setArriveBy]    = useState(false);
  const [arriveTime,  setArriveTime]  = useState('12:00');
  useEffect(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() + 30);
    setArriveTime(d.toTimeString().slice(0, 5));
  }, []);

  const [view,        setView]        = useState<'departures' | 'map'>('departures');
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [refreshing,  setRefreshing]  = useState(false);
  const isMobile = useIsMobile();

  const [, tick] = useState(0);

  // Departures fetch
  const fetchDepartures = useCallback(async () => {
    try {
      const res  = await fetch(GQL, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query: DEPARTURES_QUERY }) });
      const json = await res.json();
      setData(json.data);
      setLastUpdated(new Date());
      setFetchErr(false);
    } catch { setFetchErr(true); }
  }, []);

  useEffect(() => {
    fetchDepartures();
    const id = setInterval(fetchDepartures, 30000);
    return () => clearInterval(id);
  }, [fetchDepartures]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setMapRefreshKey(k => k + 1);
    await fetchDepartures();
    setRefreshing(false);
  }, [fetchDepartures]);

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Autocomplete
  const searchStop = useCallback(async (q: string, set: (s: Suggestion[]) => void) => {
    if (q.length < 2) { set([]); return; }
    try {
      const res  = await fetch(`${GEO}?text=${encodeURIComponent(q)}&layers=venue&size=6`);
      const json = await res.json();
      set((json.features ?? []).map((f: { properties: { id: string; label: string } }) => ({ id: f.properties.id, label: f.properties.label })));
    } catch { set([]); }
  }, []);

  useEffect(() => {
    if (fromStop) return;
    const t = setTimeout(() => searchStop(fromQuery, setFromSugg), 280);
    return () => clearTimeout(t);
  }, [fromQuery, fromStop, searchStop]);

  useEffect(() => {
    if (toStop) return;
    const t = setTimeout(() => searchStop(toQuery, setToSugg), 280);
    return () => clearTimeout(t);
  }, [toQuery, toStop, searchStop]);

  // Trip search
  const searchTrip = useCallback(async () => {
    if (!fromStop || !toStop) return;
    setTripLoading(true);
    setTripErr(false);
    try {
      let dateTime = new Date().toISOString();
      if (arriveBy) {
        const [h, m] = arriveTime.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        dateTime = d.toISOString();
      }
      const res  = await fetch(GQL, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          query: TRIP_QUERY,
          variables: { from: { place: fromStop.id }, to: { place: toStop.id }, dateTime, arriveBy },
        }),
      });
      const json = await res.json();
      setTrips(json.data?.trip?.tripPatterns ?? []);
    } catch { setTripErr(true); }
    finally { setTripLoading(false); }
  }, [fromStop, toStop, arriveBy, arriveTime]);

  useEffect(() => {
    if (fromStop && toStop) searchTrip();
  }, [fromStop, toStop, arriveBy, arriveTime, searchTrip]);

  // Unique line codes for filter
  const allLines = data
    ? [...new Set([...data.quay1.estimatedCalls, ...data.quay2.estimatedCalls, ...data.quay3.estimatedCalls, ...data.quay4.estimatedCalls].map(c => c.serviceJourney.line.publicCode))].sort()
    : [];

  const toggleLine = (code: string) =>
    setHidden(prev => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      linesCookie.write(n);
      return n;
    });

  const toggleQuay = (q: string) =>
    setHiddenQuays(prev => {
      const n = new Set(prev);
      n.has(q) ? n.delete(q) : n.add(q);
      quaysCookie.write(n);
      return n;
    });

  return (
    <main style={{ backgroundColor: '#040404', color: '#d0d0d0', minHeight: '100vh', padding: 'clamp(2rem, 5vw, 3rem) clamp(1.5rem, 6vw, 5rem)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <Link href="/anttra" style={{ ...S.mono, fontSize: '0.7rem', opacity: 0.4, color: '#d0d0d0' }}>← anttra</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ ...S.mono, fontSize: '0.62rem', opacity: 0.85 }}>
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              ...S.mono, fontSize: '0.65rem', padding: '0.2rem 0.55rem',
              border: '1px solid #d0d0d025', borderRadius: 2,
              background: 'transparent', color: refreshing ? '#d0d0d055' : '#d0d0d0cc',
              cursor: refreshing ? 'default' : 'pointer', transition: 'color 0.15s',
            }}
          >
            {refreshing ? '...' : '↺'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2.5rem' }}>
        <h1 style={{ ...S.mono, fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '-0.02em', opacity: 0.85, margin: 0 }}>
          Lerkendal
        </h1>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['departures', 'map'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                ...S.mono, fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                border: `1px solid ${view === v ? '#d0d0d055' : '#d0d0d03b'}`,
                borderRadius: 2,
                background: view === v ? '#d0d0d010' : 'transparent',
                color: view === v ? '#d0d0d0' : '#d0d0d0a6',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Map view */}
      {view === 'map' && (
        <div style={{ height: isMobile ? 'calc(100svh - 9rem)' : 'calc(100vh - 17rem)', borderRadius: 1, overflow: 'hidden', border: '1px solid #d0d0d01e' }}>
          <CyberpunkMap refreshKey={mapRefreshKey} />
        </div>
      )}

      {/* Departures + planner */}
      {view === 'departures' && <>

      {/* Filter — quays + lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ ...S.mono, fontSize: '0.6rem', opacity: 0.35, minWidth: '4.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lerkendal</span>
          {['1','2','3','4'].map(q => (
            <Chip key={q} label={q} active={!hiddenQuays.has(q)} onClick={() => toggleQuay(q)} />
          ))}
        </div>
        {allLines.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...S.mono, fontSize: '0.6rem', opacity: 0.55, minWidth: '2.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>lines</span>
            {allLines.map(code => (
              <Chip key={code} label={code} active={!hidden.has(code)} onClick={() => toggleLine(code)} />
            ))}
          </div>
        )}
      </div>

      {/* Departures — hidden while planning */}
      {fetchErr && <p style={{ ...S.mono, fontSize: '0.75rem', opacity: 0.5 }}>could not reach entur</p>}
      {!data && !fetchErr && <p style={{ ...S.mono, fontSize: '0.75rem', opacity: 0.2 }}>fetching...</p>}

      <div style={{
        display: 'grid',
        gridTemplateRows: fromQuery || fromStop ? '0fr' : '1fr',
        transition: 'grid-template-rows 0.35s ease',
        overflow: 'hidden',
      }}>
        <div style={{ minHeight: 0 }}>
          {data && (
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', paddingBottom: '4rem' }}>
              {([['1', data.quay1], ['2', data.quay2], ['3', data.quay3], ['4', data.quay4]] as [string, QuayData][])
                .filter(([q]) => !hiddenQuays.has(q))
                .map(([q, quay]) => (
                  <QuayPanel key={q} label={q} quay={quay} hidden={hidden} />
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'linear-gradient(to right, #c77dff22, #00e5a022)', margin: '1rem 0 3rem' }} />

      {/* Journey planner */}
      <div style={{ maxWidth: 560 }}>
        <p style={{ ...S.mono, fontSize: '0.62rem', opacity: 0.58, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>
          plan journey
        </p>

        {/* From — always visible */}
        <StopInput
          placeholder="from stop"
          value={fromStop ? fromStop.label : fromQuery}
          onChange={v => { setFromQuery(v); setFromStop(null); setTrips(null); }}
          suggestions={fromStop ? [] : fromSugg}
          onSelect={s => { setFromStop(s); setFromQuery(s.label); setFromSugg([]); }}
          onClear={() => { setFromStop(null); setFromQuery(''); setFromSugg([]); setTrips(null); setToStop(null); setToQuery(''); setToSlideOpen(false); }}
        />

        {/* To — slides down once the user starts typing a from stop */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: fromQuery || fromStop ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.3s ease',
            overflow: toSlideOpen ? 'visible' : 'hidden',
          }}
          onTransitionEnd={() => setToSlideOpen(!!(fromQuery || fromStop))}
        >
          <div style={{ minHeight: 0, paddingTop: fromQuery || fromStop ? '0.6rem' : 0 }}>
            <StopInput
              placeholder="to stop"
              value={toStop ? toStop.label : toQuery}
              onChange={v => { setToQuery(v); setToStop(null); setTrips(null); }}
              suggestions={toStop ? [] : toSugg}
              onSelect={s => { setToStop(s); setToQuery(s.label); setToSugg([]); }}
              onClear={() => { setToStop(null); setToQuery(''); setToSugg([]); setTrips(null); }}
            />
          </div>
        </div>

        {/* Arrive by toggle */}
        <div style={{
          display: 'grid',
          gridTemplateRows: toSlideOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease',
          overflow: 'hidden',
        }}>
          <div style={{ minHeight: 0, paddingTop: toSlideOpen ? '0.75rem' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => { setArriveBy(v => !v); setTrips(null); }}
                style={{
                  ...S.mono, fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                  border: `1px solid ${arriveBy ? '#d0d0d055' : '#d0d0d018'}`,
                  borderRadius: 2,
                  background: arriveBy ? '#d0d0d010' : 'transparent',
                  color: arriveBy ? '#d0d0d0' : '#d0d0d044',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                arrive by
              </button>
              {arriveBy && (() => {
                const [h, m] = arriveTime.split(':');
                const numStyle: React.CSSProperties = {
                  ...S.mono, fontSize: '0.78rem', background: 'transparent',
                  border: 'none', outline: 'none', color: '#d0d0d0',
                  width: '2.2ch', textAlign: 'center', MozAppearance: 'textfield',
                };
                return (
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d0d0d018', borderRadius: 2, padding: '0.25rem 0.5rem', gap: '0.1rem' }}>
                    <input type="number" min={0} max={23} value={parseInt(h)}
                      onChange={e => { setArriveTime(`${String(Math.min(23, Math.max(0, parseInt(e.target.value)||0))).padStart(2,'0')}:${m}`); setTrips(null); }}
                      style={numStyle}
                    />
                    <span style={{ ...S.mono, fontSize: '0.78rem', opacity: 0.4 }}>:</span>
                    <input type="number" min={0} max={59} value={parseInt(m)}
                      onChange={e => { setArriveTime(`${h}:${String(Math.min(59, Math.max(0, parseInt(e.target.value)||0))).padStart(2,'0')}`); setTrips(null); }}
                      style={numStyle}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Results — slide down once both stops are chosen */}
        <div style={{
          display: 'grid',
          gridTemplateRows: trips || tripLoading || tripErr ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.35s ease',
          overflow: 'hidden',
        }}>
          <div style={{ minHeight: 0, paddingTop: trips || tripLoading || tripErr ? '1.2rem' : 0 }}>
            {tripLoading && <p style={{ ...S.mono, fontSize: '0.72rem', opacity: 0.2 }}>searching...</p>}
            {tripErr     && <p style={{ ...S.mono, fontSize: '0.72rem', opacity: 0.3 }}>could not fetch routes</p>}
            {trips && trips.length === 0 && <p style={{ ...S.mono, fontSize: '0.72rem', opacity: 0.25 }}>no routes found</p>}
            {trips && trips.map((p, i) => <TripResult key={i} pattern={p} />)}
          </div>
        </div>
      </div>

      <p style={{ ...S.mono, fontSize: '0.58rem', opacity: 0.4, letterSpacing: '0.08em', marginTop: '4rem' }}>
        real-time data · entur · refreshes every 25s
      </p>

      </>}

    </main>
  );
}
