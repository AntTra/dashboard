import Link from 'next/link';

const projects = [
  { name: 'globe',      desc: 'solar system viewer',              href: '/anttra/globe', live: true  },
  { name: 'busroutes',  desc: 'real-time transit api',            href: '/anttra/busroutes', live: true  },
  { name: 'armvision',  desc: 'robot arm via hand gesture + opencv', href: null,         live: false },
];

export default function AnttraPage() {
  return (
    <main
      style={{ backgroundColor: '#040404', color: '#d0d0d0', minHeight: '100vh' }}
      className="flex flex-col px-12 md:px-24 py-16 gap-16"
    >
      <Link href="/" className="font-mono text-xs" style={{ opacity: 0.2, color: '#d0d0d0' }}>
        ← synapse
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="font-mono" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.02em' }}>
          anttra
        </h1>
        <p className="font-mono text-sm" style={{ opacity: 0.3 }}>cybernetics & robotics engineer</p>
      </div>

      <div className="flex flex-col">
        {projects.map(({ name, desc, href, live }) => {
          const inner = (
            <div
              className="flex justify-between items-baseline gap-8 py-5"
              style={{ borderTop: '1px solid #d0d0d00f' }}
            >
              <span className="font-mono" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', opacity: live ? 0.7 : 0.25 }}>
                {name}
              </span>
              <span className="font-mono text-xs" style={{ opacity: 0.15, letterSpacing: '0.06em', flex: 1, textAlign: 'right' }}>
                {desc}
              </span>
              <span className="font-mono text-xs" style={{ opacity: 0.15 }}>
                {live ? '→' : 'soon'}
              </span>
            </div>
          );
          return live && href
            ? <Link key={name} href={href} style={{ color: '#d0d0d0', textDecoration: 'none' }}>{inner}</Link>
            : <div key={name}>{inner}</div>;
        })}
        <div style={{ borderTop: '1px solid #d0d0d00f' }} />
      </div>

      <Link
        href="/anttra/void"
        className="font-mono text-xs self-start"
        style={{ opacity: 0.1, color: '#d0d0d0', letterSpacing: '0.12em' }}
      >
        ∅
      </Link>
    </main>
  );
}
