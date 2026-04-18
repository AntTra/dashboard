'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  fetchDepartures, searchStop, fetchTrip,
  type DepartureData, type Suggestion, type Call, type QuayData, type TripPattern, type Leg,
} from './api/Departure/api';

const CyberpunkMap = dynamic(() => import('./CyberpunkMap'), { ssr: false });

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

const minsUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 60000);
const delayMins = (c: Call)     => Math.round((new Date(c.expectedDepartureTime).getTime() - new Date(c.aimedDepartureTime).getTime()) / 60000);
const fmt       = (iso: string) => new Date(iso).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
const fmtDur    = (s: number)   => `${Math.floor(s / 60)} min`;

const MONO: React.CSSProperties = { fontFamily: 'monospace' };

const GLASS: React.CSSProperties = {
  background: 'rgba(28,28,32,0.52)',
  backdropFilter: 'blur(22px) saturate(150%)',
  WebkitBackdropFilter: 'blur(22px) saturate(150%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 6,
};

const GLASS_CARD: React.CSSProperties = {
  ...GLASS,
  background: 'rgba(22,22,26,0.6)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)',
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

function minsStyle(mins: number): React.CSSProperties {
  return {
    ...MONO,
    fontSize: '0.9rem',
    fontWeight: 600,
    color: mins === 0 ? '#ffffff' : mins <= 5 ? '#e0e8ff' : mins <= 15 ? '#d0d0d0' : '#d0d0d044',
    minWidth: '4.5rem',
    textAlign: 'right',
  };
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...MONO, fontSize: '0.72rem',
        padding: '0.22rem 0.6rem',
        border: `1px solid ${active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 4,
        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
        backdropFilter: active ? 'blur(8px)' : 'none',
        color: active ? '#d0d0d0' : '#d0d0d030',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function LineBadge({ code }: { code: string }) {
  return (
    <span style={{
      ...MONO,
      fontSize: '0.82rem',
      fontWeight: 700,
      minWidth: '2.4rem',
      textAlign: 'center',
      padding: '0.15rem 0.4rem',
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 4,
      color: '#e0e0f0',
      letterSpacing: '0.04em',
    }}>
      {code}
    </span>
  );
}

function DepartureRow({ call, hidden }: { call: Call; hidden: boolean }) {
  const mins  = minsUntil(call.expectedDepartureTime);
  const delay = delayMins(call);
  const mob   = useIsMobile();
  if (mins < 0 || hidden) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.65rem 0.9rem',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <LineBadge code={call.serviceJourney.line.publicCode} />

      {!mob && (
        <span style={{ ...MONO, fontSize: '0.76rem', opacity: 0.4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {call.destinationDisplay.frontText}
        </span>
      )}

      {delay > 0 && (
        <span style={{ ...MONO, fontSize: mob ? '0.7rem' : '0.65rem', color: '#e05555', opacity: 0.85 }}>+{delay}</span>
      )}

      <span style={{ ...minsStyle(mins), marginLeft: 'auto' }}>
        {mins === 0 ? 'nå' : `${mins} min`}
      </span>
    </div>
  );
}

function QuayPanel({ label, quay, hidden }: { label: string; quay: QuayData; hidden: Set<string> }) {
  const visible = quay.estimatedCalls.filter(c => minsUntil(c.expectedDepartureTime) >= 0 && !hidden.has(c.serviceJourney.line.publicCode));
  return (
    <div style={{ ...GLASS_CARD, flex: 1, minWidth: 220, overflow: 'hidden' }}>
      <div style={{ padding: '1rem 0.9rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ ...MONO, fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
          Lerkendal {label}
        </p>
        <p style={{ ...MONO, fontSize: '0.68rem', opacity: 0.35 }}>{quay.description}</p>
      </div>
      <div>
        {visible.length === 0
          ? <p style={{ ...MONO, fontSize: '0.72rem', opacity: 0.25, padding: '0.9rem' }}>no departures</p>
          : quay.estimatedCalls.map((c, i) => (
              <DepartureRow key={i} call={c} hidden={hidden.has(c.serviceJourney.line.publicCode)} />
            ))
        }
      </div>
    </div>
  );
}

function StopInput({ placeholder, value, onChange, suggestions, onSelect, onClear }: {
  placeholder: string; value: string;
  onChange: (v: string) => void;
  suggestions: Suggestion[];
  onSelect: (s: Suggestion) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{ ...GLASS, display: 'flex', alignItems: 'center' }}>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          style={{
            ...MONO, fontSize: '0.8rem', background: 'transparent',
            border: 'none', outline: 'none', color: '#d0d0d0',
            padding: '0.6rem 0.8rem', flex: 1, width: '100%',
          }}
        />
        {value && (
          <button onClick={onClear} style={{ ...MONO, background: 'none', border: 'none', color: '#d0d0d040', cursor: 'pointer', padding: '0 0.6rem', fontSize: '0.8rem' }}>×</button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, ...GLASS, borderRadius: '0 0 6px 6px', borderTop: 'none' }}>
          {suggestions.map(s => (
            <button
              key={s.id}
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              style={{ ...MONO, display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#d0d0d077', fontSize: '0.75rem', padding: '0.55rem 0.8rem', cursor: 'pointer' }}
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
    <div style={{ padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <span style={{ ...MONO, fontSize: '0.9rem', opacity: 0.85 }}>
          {first ? fmt(first) : '—'} → {last ? fmt(last) : '—'}
        </span>
        <span style={{ ...MONO, fontSize: '0.7rem', opacity: 0.28 }}>{fmtDur(pattern.duration)}</span>
        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
          {lines.map((l, i) => <LineBadge key={i} code={l} />)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {pattern.legs.map((leg, i) => (
          <span key={i} style={{ ...MONO, fontSize: '0.65rem', opacity: 0.22 }}>
            {leg.fromPlace.name}{i < pattern.legs.length - 1 ? ' →' : ` → ${leg.toPlace.name}`}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BusRoutesPage() {
  const [data,          setData]          = useState<DepartureData | null>(null);
  const [fetchErr,      setFetchErr]      = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [hidden,        setHidden]        = useState<Set<string>>(new Set());
  const [hiddenQuays,   setHiddenQuays]   = useState<Set<string>>(new Set());

  useEffect(() => {
    setHidden(linesCookie.read());
    setHiddenQuays(quaysCookie.read());
  }, []);

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

  const [view,          setView]          = useState<'departures' | 'map'>('departures');
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [refreshing,    setRefreshing]    = useState(false);
  const isMobile = useIsMobile();

  const [, tick] = useState(0);

  const doFetchDepartures = useCallback(async () => {
    try {
      const d = await fetchDepartures();
      setData(d); setLastUpdated(new Date()); setFetchErr(false);
    } catch { setFetchErr(true); }
  }, []);

  useEffect(() => {
    doFetchDepartures();
    const id = setInterval(doFetchDepartures, 30000);
    return () => clearInterval(id);
  }, [doFetchDepartures]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true); setMapRefreshKey(k => k + 1);
    await doFetchDepartures(); setRefreshing(false);
  }, [doFetchDepartures]);

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const doSearchStop = useCallback(async (q: string, set: (s: Suggestion[]) => void) => {
    try { set(await searchStop(q)); } catch { set([]); }
  }, []);

  useEffect(() => {
    if (fromStop) return;
    const t = setTimeout(() => doSearchStop(fromQuery, setFromSugg), 280);
    return () => clearTimeout(t);
  }, [fromQuery, fromStop, doSearchStop]);

  useEffect(() => {
    if (toStop) return;
    const t = setTimeout(() => doSearchStop(toQuery, setToSugg), 280);
    return () => clearTimeout(t);
  }, [toQuery, toStop, doSearchStop]);

  const doSearchTrip = useCallback(async () => {
    if (!fromStop || !toStop) return;
    setTripLoading(true); setTripErr(false);
    try {
      let dateTime = new Date().toISOString();
      if (arriveBy) {
        const [h, m] = arriveTime.split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        dateTime = d.toISOString();
      }
      setTrips(await fetchTrip(fromStop, toStop, dateTime, arriveBy));
    } catch { setTripErr(true); }
    finally { setTripLoading(false); }
  }, [fromStop, toStop, arriveBy, arriveTime]);

  useEffect(() => {
    if (fromStop && toStop) doSearchTrip();
  }, [fromStop, toStop, arriveBy, arriveTime, doSearchTrip]);

  const allLines = data
    ? [...new Set([...data.quay1.estimatedCalls, ...data.quay2.estimatedCalls, ...data.quay3.estimatedCalls, ...data.quay4.estimatedCalls]
        .map(c => c.serviceJourney.line.publicCode))].sort()
    : [];

  const toggleLine = (code: string) => setHidden(prev => {
    const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code);
    linesCookie.write(n); return n;
  });

  const toggleQuay = (q: string) => setHiddenQuays(prev => {
    const n = new Set(prev); n.has(q) ? n.delete(q) : n.add(q);
    quaysCookie.write(n); return n;
  });

  return (
    <main style={{ backgroundColor: '#1c1c20', color: '#d0d0d0', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* ambient colour blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: [
          'radial-gradient(ellipse at 8% 18%,  rgba(0,255,200,0.18)  0%, transparent 52%)',
          'radial-gradient(ellipse at 88% 35%, rgba(255,0,136,0.14)  0%, transparent 45%)',
          'radial-gradient(ellipse at 55% 80%, rgba(200,90,20,0.10)  0%, transparent 42%)',
          'radial-gradient(ellipse at 30% 58%, rgba(0,80,255,0.12)   0%, transparent 40%)',
        ].join(',') }} />
      </div>

      {/* film grain + vignette */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: [
        `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.45) 100%)',
      ].join(','), backgroundSize: '200px 200px, auto' }} />

      {/* scrollable content */}
      <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(2rem,5vw,3rem) clamp(1.5rem,6vw,5rem)' }}>

        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <Link href="/anttra" style={{ ...MONO, fontSize: '0.7rem', opacity: 0.38, color: '#d0d0d0', letterSpacing: '0.2em', textTransform: 'uppercase' }}>← anttra</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {lastUpdated && (
              <span style={{ ...MONO, fontSize: '0.6rem', opacity: 0.3 }}>
                {lastUpdated.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ ...MONO, ...GLASS, fontSize: '0.65rem', padding: '0.2rem 0.55rem', color: refreshing ? '#d0d0d044' : '#d0d0d099', cursor: refreshing ? 'default' : 'pointer', transition: 'all 0.15s' }}
            >
              {refreshing ? 'refreshing' : 'refresh ↺'}
            </button>
          </div>
        </div>

        {/* title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2.5rem' }}>
          <h1 style={{ ...MONO, fontSize: 'clamp(2rem, 6vw, 4.5rem)', letterSpacing: '-0.03em', fontWeight: 300, opacity: 0.88, margin: 0 }}>
            Lerkendal
          </h1>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {(['departures', 'map'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  ...MONO, fontSize: '0.72rem', padding: '0.25rem 0.65rem',
                  border: `1px solid ${view === v ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 4,
                  background: view === v ? 'rgba(255,255,255,0.08)' : 'transparent',
                  backdropFilter: view === v ? 'blur(10px)' : 'none',
                  color: view === v ? '#d0d0d0' : '#d0d0d055',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* map view */}
        {view === 'map' && (
          <div style={{ height: isMobile ? 'calc(100svh - 9rem)' : 'calc(100vh - 17rem)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CyberpunkMap refreshKey={mapRefreshKey} />
          </div>
        )}

        {/* departures + planner */}
        {view === 'departures' && <>

          {/* filter chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ ...MONO, fontSize: '0.58rem', opacity: 0.3, minWidth: '4.5rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Lerkendal</span>
              {['1','2','3','4'].map(q => <Chip key={q} label={q} active={!hiddenQuays.has(q)} onClick={() => toggleQuay(q)} />)}
            </div>
            {allLines.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...MONO, fontSize: '0.58rem', opacity: 0.3, minWidth: '2.5rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>lines</span>
                {allLines.map(code => <Chip key={code} label={code} active={!hidden.has(code)} onClick={() => toggleLine(code)} />)}
              </div>
            )}
          </div>

          {fetchErr  && <p style={{ ...MONO, fontSize: '0.75rem', opacity: 0.4 }}>could not reach entur</p>}
          {!data && !fetchErr && <p style={{ ...MONO, fontSize: '0.75rem', opacity: 0.18 }}>fetching...</p>}

          {/* quay panels */}
          <div style={{ display: 'grid', gridTemplateRows: fromQuery || fromStop ? '0fr' : '1fr', transition: 'grid-template-rows 0.35s ease', overflow: 'hidden' }}>
            <div style={{ minHeight: 0 }}>
              {data && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingBottom: '3rem' }}>
                  {([['1', data.quay1], ['2', data.quay2], ['3', data.quay3], ['4', data.quay4]] as [string, QuayData][])
                    .filter(([q]) => !hiddenQuays.has(q))
                    .map(([q, quay]) => <QuayPanel key={q} label={q} quay={quay} hidden={hidden} />)
                  }
                </div>
              )}
            </div>
          </div>

          {/* divider */}
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(0,255,200,0.35), rgba(255,0,136,0.2), transparent)', margin: '0.5rem 0 2.5rem' }} />

          {/* journey planner */}
          <div style={{ maxWidth: 520 }}>
            <p style={{ ...MONO, fontSize: '0.6rem', opacity: 0.4, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>
              plan journey
            </p>

            <StopInput
              placeholder="from stop"
              value={fromStop ? fromStop.label : fromQuery}
              onChange={v => { setFromQuery(v); setFromStop(null); setTrips(null); }}
              suggestions={fromStop ? [] : fromSugg}
              onSelect={s => { setFromStop(s); setFromQuery(s.label); setFromSugg([]); }}
              onClear={() => { setFromStop(null); setFromQuery(''); setFromSugg([]); setTrips(null); setToStop(null); setToQuery(''); setToSlideOpen(false); }}
            />

            <div style={{ display: 'grid', gridTemplateRows: fromQuery || fromStop ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease', overflow: toSlideOpen ? 'visible' : 'hidden' }}
              onTransitionEnd={() => setToSlideOpen(!!(fromQuery || fromStop))}>
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

            <div style={{ display: 'grid', gridTemplateRows: toSlideOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease', overflow: 'hidden' }}>
              <div style={{ minHeight: 0, paddingTop: toSlideOpen ? '0.75rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => { setArriveBy(v => !v); setTrips(null); }}
                    style={{ ...MONO, ...GLASS, fontSize: '0.72rem', padding: '0.25rem 0.65rem', border: `1px solid ${arriveBy ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`, color: arriveBy ? '#d0d0d0' : '#d0d0d044', cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    arrive by
                  </button>
                  {arriveBy && (() => {
                    const [h, m] = arriveTime.split(':');
                    const numStyle: React.CSSProperties = { ...MONO, fontSize: '0.78rem', background: 'transparent', border: 'none', outline: 'none', color: '#d0d0d0', width: '2.2ch', textAlign: 'center', MozAppearance: 'textfield' };
                    return (
                      <div style={{ ...GLASS, display: 'flex', alignItems: 'center', padding: '0.25rem 0.5rem', gap: '0.1rem' }}>
                        <input type="number" min={0} max={23} value={parseInt(h)}
                          onChange={e => { setArriveTime(`${String(Math.min(23,Math.max(0,parseInt(e.target.value)||0))).padStart(2,'0')}:${m}`); setTrips(null); }}
                          style={numStyle} />
                        <span style={{ ...MONO, fontSize: '0.78rem', opacity: 0.35 }}>:</span>
                        <input type="number" min={0} max={59} value={parseInt(m)}
                          onChange={e => { setArriveTime(`${h}:${String(Math.min(59,Math.max(0,parseInt(e.target.value)||0))).padStart(2,'0')}`); setTrips(null); }}
                          style={numStyle} />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateRows: trips || tripLoading || tripErr ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s ease', overflow: 'hidden' }}>
              <div style={{ minHeight: 0, paddingTop: trips || tripLoading || tripErr ? '1.2rem' : 0 }}>
                {tripLoading && <p style={{ ...MONO, fontSize: '0.72rem', opacity: 0.2 }}>searching...</p>}
                {tripErr     && <p style={{ ...MONO, fontSize: '0.72rem', opacity: 0.28 }}>could not fetch routes</p>}
                {trips && trips.length === 0 && <p style={{ ...MONO, fontSize: '0.72rem', opacity: 0.22 }}>no routes found</p>}
                {trips && trips.map((p, i) => <TripResult key={i} pattern={p} />)}
              </div>
            </div>
          </div>

          <p style={{ ...MONO, fontSize: '0.56rem', opacity: 0.28, letterSpacing: '0.1em', marginTop: '4rem' }}>
            real-time data · entur · refreshes every 25s
          </p>
        </>}
      </div>
    </main>
  );
}
