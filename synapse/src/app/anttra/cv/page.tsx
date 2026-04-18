'use client';

import React, { useEffect, useState } from 'react';
import { type GHUser, type GHRepo, type GHEvent, fetchGithubData } from './api';

const GITHUB_HANDLE = 'AntTra';

const DATA = {
  name: 'Anton Tran',          
  title: 'Cybernetics Engineer',
  location: 'Trondheim, Norway',
  email: 'anton.tran@live.no',    
  summary:
    'Engineer focused on real-time data systems and 3D visualisation. ' +
    'I build things that move while I myself dont move. ' +
    'Based in Trondheim, studying rocks at NTNU.',
  skills: [
    { category: 'Languages',  items: ['C++', 'TypeScript', 'Python', 'Rust'] },
    { category: 'Frontend',   items: ['React', 'Next.js', 'Three.js', 'WebGL'] },
    { category: 'Tools',      items: ['Git', 'Docker', 'Vercel', 'Ubuntu'] },
  ],
  experience: [
    {
      company: 'KSAT',
      role: 'Summer intern',
      period: '2025',
      points: ['Software developer', 'still feeling proud of giving tutorials to an employee there:D'],
    },
  ],
  education: [
    { school: 'NTNU', degree: 'Cybernetics Master', year: '2027' },
    { school: 'NTNU', degree: 'Geology Bachelor', year: '2026' },
  ],
  projects: [
    {
      name: 'Project: Synapse',
      tech: ['Three.js', 'Next.js', 'Entur SIRI VM', 'IP banned'],
      desc: "3D rendering of wojak globes. Real-time(when is it ever?) 3D cyberpunk transit map of Trondheim. Live bus positions(when my IP address doesn't get locked out), stop departures, arrival notifications.",
      href: '/anttra/',
    },
    {
      name: 'Landmark measurements fusing with ESKF for drift correction',
      tech: ['ROS2', 'C++', 'Perception','Getting humbled'],
      desc: "Beginner friendly task(according to my boss)",
      href: '/anttra/busroutes',
    },
    {
      name: 'Project: Beer',
      tech: ['Hydrometer', 'Fermenter', 'Good mood'],
      desc: 'Getting drunk',
      href: 'https://rusinfo.no/trenger_du_hjelp/hjelp-a-slutte-alkohol/',
    },
  ],
};

const C = {
  bg: '#040404', border: 'rgba(255,255,255,0.07)', accent: '#ff0088',
  cyan: '#00ffcc', dim: 'rgba(255,255,255,0.35)', text: '#d0d0d0',
};

const mono: React.CSSProperties = { fontFamily: 'monospace' };

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const,
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2,
      padding: '1px 5px', color: C.dim, whiteSpace: 'nowrap' as const,
    }}>{children}</span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const,
      color: C.cyan, opacity: 0.6, marginBottom: '1rem', marginTop: '2.5rem',
      borderBottom: `1px solid ${C.border}`, paddingBottom: '0.4rem',
    }}>{children}</div>
  );
}

function dotColor(type: string) {
  return type === 'PushEvent' ? '#00ffcc' : type === 'CreateEvent' ? '#ffdd00' :
    type === 'PullRequestEvent' ? '#ff0088' : type === 'IssuesEvent' ? '#ff7700' : C.dim;
}

function relTime(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function eventSummary(ev: GHEvent): string {
  if (ev.type === 'PushEvent') {
    const msg = ev.payload.commits?.[0]?.message ?? '';
    return msg.length > 60 ? msg.slice(0, 57) + '…' : msg;
  }
  if (ev.type === 'CreateEvent') return `created ${ev.payload.ref ?? 'branch'}`;
  if (ev.type === 'PullRequestEvent') return `PR ${ev.payload.action ?? ''}`;
  if (ev.type === 'IssuesEvent') return `issue ${ev.payload.action ?? ''}`;
  return ev.type.replace('Event', '');
}

export default function CVPage() {
  const [ghUser,   setGhUser]   = useState<GHUser | null>(null);
  const [ghRepos,  setGhRepos]  = useState<GHRepo[]>([]);
  const [ghEvents, setGhEvents] = useState<GHEvent[]>([]);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [ghError,  setGhError]  = useState(false);

  useEffect(() => {
    fetchGithubData(GITHUB_HANDLE)
      .then(({ user, repos, events }) => {
        if (user) setGhUser(user);
        setGhRepos(repos);
        setGhEvents(events);
      })
      .catch(() => setGhError(true));
  }, []);

  useEffect(() => {
    if (!photoSrc && ghUser?.avatar_url) setPhotoSrc(ghUser.avatar_url);
  }, [ghUser, photoSrc]);

  return (
    <main style={{ backgroundColor: C.bg, color: C.text, minHeight: '100vh', padding: '4rem 5vw', ...mono }}>

      {/* Header */}
      <header style={{ marginBottom: '3rem', borderBottom: `1px solid ${C.border}`, paddingBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' as const }}>

          {/* Photo — GitHub avatar */}
          {photoSrc && (
            <img src={photoSrc} alt="profile"
              style={{ width: 130, height: 130, objectFit: 'cover' as const, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
          )}

          {/* Name */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, letterSpacing: '-0.03em' }}>{DATA.name}</h1>
            <p style={{ fontSize: '0.85rem', color: C.accent, margin: '0.3rem 0 0.8rem', opacity: 0.9 }}>{DATA.title}</p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' as const, fontSize: '0.7rem', color: C.dim }}>
              <span>{DATA.location}</span>
              <span>{DATA.email}</span>
              <a href={`https://github.com/${GITHUB_HANDLE}`} target="_blank" style={{ color: C.dim }}>
                github.com/{GITHUB_HANDLE}
              </a>
            </div>
            {ghUser && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.65rem', color: C.dim, display: 'flex', gap: '1.2rem', flexWrap: 'wrap' as const }}>
                <span>{ghUser.public_repos} repos</span>
                <span>{ghUser.followers} followers</span>
                {ghUser.bio && <span style={{ fontStyle: 'italic' }}>{ghUser.bio}</span>}
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4rem' }}>

        {/* Sidebar */}
        <aside>
          <SectionTitle>Summary</SectionTitle>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.7, opacity: 0.8, margin: 0 }}>{DATA.summary}</p>

          <SectionTitle>Skills</SectionTitle>
          {DATA.skills.map(g => (
            <div key={g.category} style={{ marginBottom: '0.9rem' }}>
              <div style={{ fontSize: '0.62rem', color: C.dim, marginBottom: '0.3rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{g.category}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.3rem' }}>
                {g.items.map(it => <Tag key={it}>{it}</Tag>)}
              </div>
            </div>
          ))}

          <SectionTitle>Education</SectionTitle>
          {DATA.education.map((e, i) => (
            <div key={i} style={{ marginBottom: '0.8rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 'bold' }}>{e.school}</div>
              <div style={{ fontSize: '0.72rem', color: C.dim }}>{e.degree} · {e.year}</div>
            </div>
          ))}

          {ghRepos.length > 0 && <>
            <SectionTitle>Recent Repos</SectionTitle>
            {ghRepos.map(r => (
              <a key={r.name} href={r.html_url} target="_blank" style={{ display: 'block', textDecoration: 'none', marginBottom: '0.9rem' }}>
                <div style={{ fontSize: '0.75rem', color: C.cyan, opacity: 0.85 }}>{r.name}</div>
                {r.description && (
                  <div style={{ fontSize: '0.65rem', color: C.dim, marginTop: '0.15rem', lineHeight: 1.4 }}>
                    {r.description.length > 70 ? r.description.slice(0, 67) + '…' : r.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', flexWrap: 'wrap' as const }}>
                  {r.language && <Tag>{r.language}</Tag>}
                  {r.stargazers_count > 0 && <Tag>★ {r.stargazers_count}</Tag>}
                </div>
              </a>
            ))}
          </>}

          {ghError && <div style={{ fontSize: '0.65rem', color: C.dim, marginTop: '1rem', opacity: 0.5 }}>github unavailable</div>}
        </aside>

        {/* Main */}
        <section>
          <SectionTitle>Experience</SectionTitle>
          {DATA.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{exp.company}</span>
                <span style={{ fontSize: '0.65rem', color: C.dim }}>{exp.period}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: C.accent, marginBottom: '0.7rem', opacity: 0.85 }}>{exp.role}</div>
              <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                {exp.points.map((p, j) => (
                  <li key={j} style={{ fontSize: '0.82rem', lineHeight: 1.6, opacity: 0.8, marginBottom: '0.35rem' }}>{p}</li>
                ))}
              </ul>
            </div>
          ))}

          <SectionTitle>Projects</SectionTitle>
          {DATA.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: '2rem', borderLeft: '2px solid rgba(255,255,255,0.07)', paddingLeft: '1rem' }}>
              <div style={{ marginBottom: '0.3rem' }}>
                {proj.href
                  ? <a href={proj.href} style={{ fontSize: '0.9rem', fontWeight: 'bold', color: C.text, textDecoration: 'none' }}>{proj.name}</a>
                  : <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{proj.name}</span>
                }
              </div>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.6, opacity: 0.75, margin: '0.3rem 0 0.5rem' }}>{proj.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.3rem' }}>
                {proj.tech.map(t => <Tag key={t}>{t}</Tag>)}
              </div>
            </div>
          ))}

          {ghEvents.length > 0 && <>
            <SectionTitle>GitHub Activity</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.55rem' }}>
              {ghEvents.map((ev, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1rem 1fr auto', gap: '0.4rem', alignItems: 'baseline', fontSize: '0.72rem' }}>
                  <span style={{ color: dotColor(ev.type), fontSize: '0.7rem' }}>●</span>
                  <div style={{ opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    <span style={{ color: C.dim, fontSize: '0.6rem', marginRight: '0.5rem' }}>
                      {ev.repo.name.replace(`${GITHUB_HANDLE}/`, '')}
                    </span>
                    {eventSummary(ev)}
                  </div>
                  <span style={{ color: C.dim, fontSize: '0.6rem', whiteSpace: 'nowrap' as const }}>{relTime(ev.created_at)}</span>
                </div>
              ))}
            </div>
          </>}
        </section>
      </div>
    </main>
  );
}
