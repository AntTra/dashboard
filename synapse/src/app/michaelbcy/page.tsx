import Link from 'next/link';

export default function MichaelbcyPage() {
  return (
    <main className="min-h-screen flex flex-col px-12 py-16 gap-12">
      <div className="flex items-baseline gap-6">
        <Link href="/" className="font-mono text-sm opacity-40 hover:opacity-100">← synapse</Link>
      </div>
      <h1 className="font-mono text-5xl tracking-tight">michaelbcy</h1>
      <p className="font-mono text-sm opacity-40">projects coming soon</p>
    </main>
  );
}
